on run
  tell application "Windsurf" to activate
  delay 0.2
  tell application "System Events"
    keystroke "/startend"
    key code 36 -- Return
  end tell
end run
