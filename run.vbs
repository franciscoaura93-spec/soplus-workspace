Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Francisco Rodrigues\Desktop\Soplus\web"
WshShell.Run """C:\Users\Francisco Rodrigues\AppData\Local\Programs\Python\Python312\python.exe"" ""C:\Users\Francisco Rodrigues\Desktop\Soplus\web\launcher.py""", 1, False
