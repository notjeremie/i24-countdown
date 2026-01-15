' VBScript to launch the countdown server silently (no console window)
Set WshShell = CreateObject("WScript.Shell")

' Get the directory where this script is located
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
projectDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(scriptDir)

' Change to project directory and run the server
WshShell.CurrentDirectory = projectDir

' Run npm start silently (no window)
WshShell.Run "cmd /c npm run build && npm start", 0, False

' Optional: Show a brief notification
WshShell.Popup "i24 Countdown Server Starting..." & vbCrLf & vbCrLf & "OBS URL: http://localhost:3000/network-display" & vbCrLf & "Stream Deck API: http://localhost:3000/api/offline", 5, "i24 Countdown", 64
