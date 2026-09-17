; Вызывается ПЕРЕД тем, как инсталлятор начнет удалять старую версию при обновлении
!macro customRemoveFiles
  ; Если папка data существует рядом с exe, временно уводим её в RAM-диск инсталлятора
  ${If} ${FileExists} "$INSTDIR\data\*.*"
    Rename "$INSTDIR\data" "$PLUGINSDIR\data_backup"
  ${EndIf}
!macroend

; Вызывается ПОСЛЕ того, как новая версия распаковалась
!macro customInstallFiles
  ; Возвращаем папку данных на место из буфера
  ${If} ${FileExists} "$PLUGINSDIR\data_backup\*.*"
    ; Если в новой сборке случайно оказалась пустая папка data, сносим её заготовку
    RMDir /r "$INSTDIR\data" 
    ; Возвращаем оригинальную базу на её законное место
    Rename "$PLUGINSDIR\data_backup" "$INSTDIR\data"
  ${EndIf}
!macroend

; Защита папки data при полном удалении приложения пользователем
!macro customUnInstallFiles
  ; Чтобы деинсталлятор Electron-builder вообще не смог до неё дотянуться
  ${If} ${FileExists} "$INSTDIR\data\*.*"
    Rename "$INSTDIR\data" "$PLUGINSDIR\data_uninstall_backup"
  ${EndIf}
!macroend

!macro customUnInstallFilesAfter
  ; Когда деинсталлятор всё зачистил и закрылся, возвращаем папку data обратно в пустой INSTDIR
  ${If} ${FileExists} "$PLUGINSDIR\data_uninstall_backup\*.*"
    CreateDirectory "$INSTDIR"
    Rename "$PLUGINSDIR\data_uninstall_backup" "$INSTDIR\data"
  ${EndIf}
!macroend
