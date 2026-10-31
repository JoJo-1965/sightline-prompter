; Compile with makensis /DPREVIEW_OUT=<temporary exe path>.
; Exercises the real finish page without installing, launching or registering
; anything. Selected actions are written beside the preview executable.
Unicode true
RequestExecutionLevel user
Name "Sightline Prompter"
Caption "Sightline Prompter Setup"
BrandingText " "
OutFile "${PREVIEW_OUT}"
InstallDir "$TEMP\Sightline installer preview"
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "FileFunc.nsh"
!define isUpdated "0 = 1"
!define StdUtils.ExecShellAsUser "!insertmacro PreviewOpen"
Var launchLink
Var previewCase

!macro PreviewOpen result file verb args
	FileOpen $R0 "$EXEDIR\finish-results.txt" a
	FileSeek $R0 0 END
	FileWrite $R0 "${file}|${args}$\r$\n"
	FileClose $R0
!macroend

!macro customSightlineFinishShow
	${NSD_GetState} $sightlineRun $R1
	${NSD_GetState} $sightlineNotes $R2
	${NSD_GetState} $sightlineGettingStarted $R3
	FileOpen $R0 "$EXEDIR\finish-defaults.txt" w
	FileWrite $R0 "$R1,$R2,$R3"
	FileClose $R0
	${If} $previewCase != ""
		GetFunctionAddress $0 PreviewTick
		nsDialogs::CreateTimer $0 300
	${EndIf}
!macroend

!include "..\build\installer.nsh"
!insertmacro customFinishPage
!insertmacro MUI_LANGUAGE "English"

Function .onInit
	StrCpy $launchLink "Sightline Prompter"
	${GetParameters} $R0
	${GetOptions} $R0 "/CASE=" $previewCase
FunctionEnd

; Optional internal automation, using the real page handles and leave callback.
; Bits 1/2/4 select Run/Notes/Getting Started. No real shell action is executed.
Function PreviewTick
	${If} $sightlineRun == ""
		SendMessage $HWNDPARENT ${WM_COMMAND} 1 0
	${Else}
		IntOp $R1 $previewCase & 1
		${NSD_SetState} $sightlineRun $R1
		IntOp $R1 $previewCase & 2
		IntOp $R1 $R1 >> 1
		${NSD_SetState} $sightlineNotes $R1
		IntOp $R1 $previewCase & 4
		IntOp $R1 $R1 >> 2
		${NSD_SetState} $sightlineGettingStarted $R1
		${NSD_KillTimer} PreviewTick
		System::Call 'user32::PostMessageW(p $HWNDPARENT, i ${WM_COMMAND}, p 1, p 0)'
	${EndIf}
FunctionEnd

Section
SectionEnd
