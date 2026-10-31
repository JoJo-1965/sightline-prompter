; Reads the real NSIS command-line parser; installs and deletes nothing.
Unicode true
Name "Sightline directory argument check"
OutFile "${PREVIEW_OUT}"
RequestExecutionLevel user
SilentInstall silent
InstallDir "$TEMP\Sightline directory preview"
Section
	FileOpen $0 "${PREVIEW_RESULT}" w
	FileWrite $0 "$INSTDIR"
	FileClose $0
SectionEnd
