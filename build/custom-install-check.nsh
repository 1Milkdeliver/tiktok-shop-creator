; custom-install-check.nsh — prevent duplicate install (runs in customInit)
; Uses standard NSIS commands only

!macro customInit
  ; 1) Check target install dir for existing exe
  IfFileExists "$INSTDIR\TikTokShop达人抓取.exe" 0 not_installed
    ; existing install found — read version from registry if available
    ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\TikTokShop达人抓取" "DisplayVersion"
    StrCmp $0 "" no_version
      MessageBox MB_YESNO|MB_ICONQUESTION "检测到已安装 TikTokShop达人抓取 v$0。$\r$\n$\r$\n继续安装将覆盖旧版本（Cookie、历史记录、输出文件都会保留）。$\r$\n$\r$\n是否继续？" IDYES proceed
      Abort
      proceed:
      Goto done_check
    no_version:
      MessageBox MB_YESNO|MB_ICONQUESTION "检测到该目录已安装 TikTokShop达人抓取。$\r$\n$\r$\n继续安装将覆盖旧版本（数据保留）。$\r$\n$\r$\n是否继续？" IDYES proceed2
      Abort
      proceed2:
      Goto done_check
  not_installed:
  done_check:
!macroend
