# Preview 07 verification

2 November 2026. Packaged source `1b099aa`, code `e4bf0f4`, documentation
revision 8. One combined build includes all approved Preview 06 fixes and the
full queued compact-button request. The JL review snapshot is `13d01f4`.

Source and packaged native checks passed for all 34 sections, every subtab and
five Settings sizes. Modes, guide reference/Ideal separation, persistence,
Apply/Cancel, theme files, actual pointer interaction, non-modal preview close
and capture policy were checked. The Guide/OBS/warning geometry passed at three
prompter sizes. Windows executable metadata and version guards passed.
Unchanged logic retains the full unit and recorder regression evidence from
Preview 06; the changed mirror CSS was checked in both source and package.

The actual packaged Screens view was compared with the approved combined
reference at 1064×691. Column ownership, navigation, header search, fixed footer
and visible subtabs are retained. Compact toolbar-icon mirror buttons are the
requested change. Offline help resolves 605 local links/pictures. The 237-entry
feature exports, JL snapshot guard and complete draft website build passed.

The app is running from:
`D:/Sightline/Dev/Builds/Previews/settings-layout-preview-07/win-unpacked/Sightline Prompter.exe`.
Live verification confirms both mirror buttons are 110×32, the two Screens
subtabs are visible and the right example remains present. All saved settings,
nine script slots and pairings match the verified pre-launch backup. Slot 4
remains active (internal index 3). No recording was started.

The initial backup copy overlapped the old app's final save and was empty.
The live profile remained valid. The backup was repeated after full process
exit, parsed successfully and verified before relaunch. The retained backup
is `app-state-before-preview07.json` in the existing Preview 05 test profile.

| Artifact | SHA-256 |
| --- | --- |
| Sightline Prompter.exe | `39365a76d80cfdfc4cb715b5c551774edd41a0aec9548b107d52ce0d470d08db` |
| resources/app.asar | `1f0660680890106430511e69e1de54d3c385f75dc72d35a4e19dbb21f11ac3ce` |

The launcher, START-HERE guide and manifest are beside `win-unpacked`.
Packaged captures are in `D:/Sightline/Dev/Testing/Settings-Redesign/Preview07-Packaged`.
Physical recording, controller/phone, capture and sync acceptance remain
separate. No release, Marketplace change or live website deployment was made.
