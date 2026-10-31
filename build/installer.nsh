!include "nsDialogs.nsh"

; Keep the three finish choices independent. Custom pages are not called in
; silent installs, so updates cannot unexpectedly open documentation.
!macro customFinishPage
	Var sightlineRun
	Var sightlineNotes
	Var sightlineGettingStarted
	Page custom SightlineFinishShow SightlineFinishLeave

	Function SightlineFinishShow
		!insertmacro MUI_HEADER_TEXT "Sightline Prompter is installed" "Choose what to open, then select Finish."
		nsDialogs::Create 1018
		Pop $0
		${If} $0 == error
			Abort
		${EndIf}
		${NSD_CreateLabel} 0 0 100% 28u "You're ready to use Sightline. The release notes and Getting Started guide open in your browser and work offline."
		Pop $0
		${NSD_CreateCheckbox} 0 42u 100% 14u "&Run Sightline Prompter"
		Pop $sightlineRun
		${NSD_Check} $sightlineRun
		${NSD_CreateCheckbox} 0 66u 100% 14u "Read release &notes"
		Pop $sightlineNotes
		${NSD_CreateCheckbox} 0 90u 100% 14u "Read &Getting Started guide"
		Pop $sightlineGettingStarted
		; Installation is complete: only Finish is useful here.
		GetDlgItem $0 $HWNDPARENT 3
		EnableWindow $0 0
		GetDlgItem $0 $HWNDPARENT 2
		EnableWindow $0 0
		GetDlgItem $0 $HWNDPARENT 1
		SendMessage $0 ${WM_SETTEXT} 0 "STR:&Finish"
		!ifmacrodef customSightlineFinishShow
			!insertmacro customSightlineFinishShow
		!endif
		nsDialogs::Show
	FunctionEnd

	Function SightlineFinishLeave
		${NSD_GetState} $sightlineRun $0
		${If} $0 == ${BST_CHECKED}
			StrCpy $1 ""
			${If} ${isUpdated}
				StrCpy $1 "--updated"
			${EndIf}
			${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
		${EndIf}
		${NSD_GetState} $sightlineNotes $0
		${If} $0 == ${BST_CHECKED}
			${StdUtils.ExecShellAsUser} $0 "$INSTDIR\resources\installer-help\release-notes.html" "open" ""
		${EndIf}
		${NSD_GetState} $sightlineGettingStarted $0
		${If} $0 == ${BST_CHECKED}
			${StdUtils.ExecShellAsUser} $0 "$INSTDIR\resources\installer-help\docs\guide\01-getting-started.html" "open" ""
		${EndIf}
	FunctionEnd
!macroend
