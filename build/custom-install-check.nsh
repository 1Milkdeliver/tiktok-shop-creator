; custom-install-check.nsh — prevent duplicate install (runs in customInit)
; Checks registry uninstall entries for existing install (any key whose DisplayName contains "TikTokShop达人抓取")

!macro customInit
  StrCpy $0 ""              ; $0 = existing install display name (empty = not found)
  StrCpy $1 0               ; index counter

  loop_reg:
    EnumRegKey $2 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall" $1
    StrCmp $2 "" reg_done   ; no more keys
    ReadRegStr $3 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\$2" "DisplayName"
    StrCmp $3 "" next_key
    ; check prefix "TikTokShop达人抓取" (14 chars incl. leading space handled below)
    StrCpy $4 $3 14
    StrCmp $4 "TikTokShop达人抓取" found_install next_key
  next_key:
    IntOp $1 $1 + 1
    Goto loop_reg

  found_install:
    StrCpy $0 $3
  reg_done:

  ${If} $0 != ""
    MessageBox MB_YESNO|MB_ICONQUESTION "检测到已安装：$0$\r$\n$\r$\n继续安装将覆盖旧版本（Cookie、历史记录、输出文件都会保留）。$\r$\n$\r$\n是否继续？" IDYES proceed
    Abort
    proceed:
  ${EndIf}

  ; also check target dir
  IfFileExists "$INSTDIR\TikTokShop达人抓取.exe" 0 not_installed
    MessageBox MB_YESNO|MB_ICONQUESTION "检测到安装目录已存在 TikTokShop达人抓取。$\r$\n$\r$\n继续安装将覆盖旧版本（数据保留）。$\r$\n$\r$\n是否继续？" IDYES proceed2
    Abort
    proceed2:
  not_installed:
!macroend
