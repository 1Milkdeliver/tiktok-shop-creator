; Auto-close any running instance of the app before install/update,
; so users never see "TikTokShop达人抓取 cannot be closed" during upgrades.
!macro customInit
  nsProcess::_FindProcess "TikTokShop达人抓取.exe" $R0
  ${If} $R0 = 0
    nsProcess::_KillProcess "TikTokShop达人抓取.exe" $R1
    Sleep 1500
  ${EndIf}
!macroend
