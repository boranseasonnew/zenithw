Unicode true
!include "MUI2.nsh"
!include "x64.nsh"
!include "WinVer.nsh"

!define PRODUCT_GUID "b488ee39-dfc6-4cad-9cf7-16e068d552e3"
!define INSTALL_KEY "Software\${PRODUCT_GUID}"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_GUID}"
!define WEBVIEW_KEY "SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"

Name "ZenithW ${APP_VERSION}"
OutFile "${SETUP_EXE}"
InstallDir "$LOCALAPPDATA\Programs\Zenith"
InstallDirRegKey HKCU "${INSTALL_KEY}" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
CRCCheck force
VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey "ProductName" "ZenithW Desktop"
VIAddVersionKey "CompanyName" "ZenithW contributors"
VIAddVersionKey "FileDescription" "ZenithW Desktop Setup"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "ProductVersion" "${APP_VERSION}"
VIAddVersionKey "LegalCopyright" "ZenithW contributors"

!define MUI_ICON "${APP_ICON}"
!define MUI_UNICON "${APP_ICON}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\Zenith.exe"
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Turkish"
!insertmacro MUI_LANGUAGE "German"
!insertmacro MUI_LANGUAGE "Russian"

LangString RequiresWindows ${LANG_ENGLISH} "ZenithW requires 64-bit Windows 10 or Windows 11."
LangString RequiresWindows ${LANG_TURKISH} "ZenithW için 64 bit Windows 10 veya Windows 11 gerekir."
LangString RequiresWindows ${LANG_GERMAN} "ZenithW benötigt Windows 10 oder Windows 11 (64 Bit)."
LangString RequiresWindows ${LANG_RUSSIAN} "Для ZenithW требуется 64-разрядная Windows 10 или Windows 11."
LangString WebViewFailed ${LANG_ENGLISH} "Microsoft Edge WebView2 Runtime could not be installed. Install it and run ZenithW Setup again."
LangString WebViewFailed ${LANG_TURKISH} "Microsoft Edge WebView2 Runtime kurulamadı. Bileşeni kurup ZenithW kurulumunu yeniden çalıştır."
LangString WebViewFailed ${LANG_GERMAN} "Microsoft Edge WebView2 Runtime konnte nicht installiert werden. Installieren Sie die Laufzeit und starten Sie ZenithW Setup erneut."
LangString WebViewFailed ${LANG_RUSSIAN} "Не удалось установить Microsoft Edge WebView2 Runtime. Установите компонент и снова запустите установку ZenithW."
LangString FilesFailed ${LANG_ENGLISH} "ZenithW could not write the application files. Close ZenithW and run Setup again."
LangString FilesFailed ${LANG_TURKISH} "ZenithW uygulama dosyalarını yazamadı. ZenithW’yi kapatıp kurulumu yeniden çalıştır."
LangString FilesFailed ${LANG_GERMAN} "ZenithW konnte die Anwendungsdateien nicht schreiben. Schließen Sie ZenithW und starten Sie das Setup erneut."
LangString FilesFailed ${LANG_RUSSIAN} "Не удалось записать файлы приложения. Закройте ZenithW и снова запустите установку."

Function .onInit
  SetShellVarContext current
  ${IfNot} ${RunningX64}
  ${OrIfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "$(RequiresWindows)" /SD IDOK
    SetErrorLevel 1
    Abort
  ${EndIf}
FunctionEnd

Function EnsureWebView
  SetRegView 32
  ReadRegStr $0 HKLM "${WEBVIEW_KEY}" "pv"
  ${If} $0 != ""
  ${AndIf} $0 != "0.0.0.0"
    Return
  ${EndIf}
  ReadRegStr $0 HKCU "${WEBVIEW_KEY}" "pv"
  ${If} $0 != ""
  ${AndIf} $0 != "0.0.0.0"
    Return
  ${EndIf}

  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File /oname=MicrosoftEdgeWebview2Setup.exe "${BOOTSTRAP}"
  ClearErrors
  ExecWait '"$PLUGINSDIR\MicrosoftEdgeWebview2Setup.exe" /silent /install' $0
  ${If} ${Errors}
  ${OrIf} $0 != 0
    MessageBox MB_ICONSTOP "$(WebViewFailed)" /SD IDOK
    SetErrorLevel 1
    Abort
  ${EndIf}
FunctionEnd

Section "ZenithW"
  Call EnsureWebView

  ClearErrors
  SetOutPath "$INSTDIR"
  File "${PAYLOAD}\Zenith.exe"
  File "${PAYLOAD}\LICENSE"
  File "${PAYLOAD}\THIRD_PARTY_NOTICES.md"
  File "${PAYLOAD}\THIRD_PARTY_LICENSES.txt"
  File "${PAYLOAD}\THIRD_PARTY_RUST_RUNTIME.html"
  SetOutPath "$INSTDIR\bin"
  File "${PAYLOAD}\bin\yt-dlp.exe"
  File "${PAYLOAD}\bin\ffmpeg.exe"
  File "${PAYLOAD}\bin\ffprobe.exe"
  File "${PAYLOAD}\bin\aria2c.exe"
  File "${PAYLOAD}\bin\deno.exe"
  ${If} ${Errors}
    MessageBox MB_ICONSTOP "$(FilesFailed)" /SD IDOK
    SetErrorLevel 1
    Abort
  ${EndIf}
  Delete "$INSTDIR\portable.marker"

  ; Remove only files owned by the legacy runtime. User data lives separately
  ; in %APPDATA%\Zenith Stable and the user's download folder.
  ReadRegStr $1 HKCU "${INSTALL_KEY}" "InstallLocation"
  StrCmp $1 "$INSTDIR" 0 legacy_cleaned
  IfFileExists "$INSTDIR\resources\app.asar" 0 legacy_cleaned
  ; The old installer let yt-dlp update in place. Move that copy into the
  ; current engine directory without replacing a user's existing engine.
  IfFileExists "$INSTDIR\resources\bin\yt-dlp.exe" 0 legacy_engine_done
  IfFileExists "$APPDATA\Zenith Stable\engine\yt-dlp.exe" legacy_engine_present
  CreateDirectory "$APPDATA\Zenith Stable\engine"
  Rename "$INSTDIR\resources\bin\yt-dlp.exe" "$APPDATA\Zenith Stable\engine\yt-dlp.exe"
  Goto legacy_engine_done

legacy_engine_present:
  Delete "$INSTDIR\resources\bin\yt-dlp.exe"

legacy_engine_done:
  Delete "$INSTDIR\resources\app.asar"
  Delete "$INSTDIR\resources\default_app.asar"
  Delete "$INSTDIR\resources\elevate.exe"
  Delete "$INSTDIR\resources\bin\ffmpeg.exe"
  Delete "$INSTDIR\resources\bin\ffprobe.exe"
  Delete "$INSTDIR\resources\bin\aria2c.exe"
  Delete "$INSTDIR\resources\bin\deno.exe"
  RMDir "$INSTDIR\resources\bin"
  RMDir "$INSTDIR\resources"
  Delete "$INSTDIR\locales\*.pak"
  RMDir "$INSTDIR\locales"
  Delete "$INSTDIR\chrome_100_percent.pak"
  Delete "$INSTDIR\chrome_200_percent.pak"
  Delete "$INSTDIR\d3dcompiler_47.dll"
  Delete "$INSTDIR\dxcompiler.dll"
  Delete "$INSTDIR\dxil.dll"
  Delete "$INSTDIR\ffmpeg.dll"
  Delete "$INSTDIR\icudtl.dat"
  Delete "$INSTDIR\libEGL.dll"
  Delete "$INSTDIR\libGLESv2.dll"
  Delete "$INSTDIR\LICENSE.electron.txt"
  Delete "$INSTDIR\LICENSES.chromium.html"
  Delete "$INSTDIR\resources.pak"
  Delete "$INSTDIR\snapshot_blob.bin"
  Delete "$INSTDIR\v8_context_snapshot.bin"
  Delete "$INSTDIR\version"
  Delete "$INSTDIR\vk_swiftshader_icd.json"
  Delete "$INSTDIR\vk_swiftshader.dll"
  Delete "$INSTDIR\vulkan-1.dll"

legacy_cleaned:
  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall Zenith.exe"
  CreateShortcut "$SMPROGRAMS\ZenithW.lnk" "$INSTDIR\Zenith.exe"
  CreateShortcut "$DESKTOP\ZenithW.lnk" "$INSTDIR\Zenith.exe"
  WriteRegStr HKCU "${INSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "ZenithW ${APP_VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "ZenithW contributors"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\Zenith.exe"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '$\"$INSTDIR\Uninstall Zenith.exe$\"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "QuietUninstallString" '$\"$INSTDIR\Uninstall Zenith.exe$\" /S'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$SMPROGRAMS\ZenithW.lnk"
  Delete "$DESKTOP\ZenithW.lnk"
  Delete "$INSTDIR\bin\yt-dlp.exe"
  Delete "$INSTDIR\bin\ffmpeg.exe"
  Delete "$INSTDIR\bin\ffprobe.exe"
  Delete "$INSTDIR\bin\aria2c.exe"
  Delete "$INSTDIR\bin\deno.exe"
  RMDir "$INSTDIR\bin"
  Delete "$INSTDIR\LICENSE"
  Delete "$INSTDIR\THIRD_PARTY_NOTICES.md"
  Delete "$INSTDIR\THIRD_PARTY_LICENSES.txt"
  Delete "$INSTDIR\THIRD_PARTY_RUST_RUNTIME.html"
  Delete "$INSTDIR\Zenith.exe"
  Delete "$INSTDIR\Uninstall Zenith.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  DeleteRegKey HKCU "${INSTALL_KEY}"
SectionEnd
