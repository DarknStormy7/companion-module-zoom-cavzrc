# CAVZRC Companion module

Bitfocus Companion module for **Custom AV for Zoom Rooms Controller (CAVZRC)**. Control Zoom Rooms via OSC from Companion: join/leave meetings, mute, NDI/HWIO/Dante outputs, device settings, overlays, content share, and more. Feedbacks and variables update when CAVZRC sends OSC back to Companion.

**Requirements:** Zoom Rooms 6.5.0+, CAVZRC 1.2.0+ (7.1.0+ for the gallery grid size and exclude options). The CAVZRC OSC API is in Beta.

> **This is a fork** of [bitfocus/companion-module-zoom-cavzrc](https://github.com/bitfocus/companion-module-zoom-cavzrc), built for rooms that drive many SDI/HDMI outputs from CAVZRC. It adds the CAVZRC 7.1 gallery controls, per-query polling and several fixes. See [What this fork adds](#what-this-fork-adds). The module in the Companion store is the upstream one and does not have these changes.

---

## What this fork adds

### Fixes

- **Room index is 1-based.** CAVZRC numbers rooms from 1; upstream added 1 again, so "room index" targets driven from variables hit the wrong room.
- **Room variables by position.** `room_1_*` … `room_10_*` are filled in CAVZRC list order even when replies arrive out of order or with gaps. `room_N_cavzrc_index` shows CAVZRC's own index.
- **Room lists stay current.** A resent list replaces the old one, so removed rooms drop out. Both `pairedRoomList` (what CAVZRC sends) and `pairedRoomsList` (what the API document says) are accepted, same for the added list.
- **"In meeting" means in a meeting.** The feedback is only true for "In Meeting", not while the room is still connecting.
- **Variables in action fields work.** Text fields marked for variables (room ID, name, index, channel lists…) were sent with `$(...)` still in them; they are now resolved first.

### Polling, one setting per query

Upstream never asked CAVZRC for status, so variables stayed empty until a button asked. Each query now has its own setting (Off, on connect, or an interval):

| Query | Default | Note |
| ----- | ------- | ---- |
| Meeting status | every 5 s | |
| Participant count | every 2.5 s | only while the room is in a meeting |
| Gallery seats and "not joined" count | every 10 s | only while the room is in a meeting |
| Gallery mode, grid size, exclude options | every 30 s | read-only; set Off if you don't use them |
| HWIO channel routing | on connect | Off / On connect / Every 60 s; also fills each channel's number |
| Room lists | on connect | refreshed again when a reply comes from an unknown room |

Mute and camera status need no polling: CAVZRC sends them when they change. **Refresh all now** asks for everything once. A connection from an older build keeps its old "Poll Interval" for meeting status and participant count.

### Connection health

**No-data warning:** when nothing arrives from CAVZRC for the chosen time, the connection turns red and a probe is sent; it recovers by itself when data comes back.

### Gallery ("not joined" seats), CAVZRC 7.1

In **Assigned** distribution mode a seat keeps a person's name after they leave or rename, shown as "<name> not joined". New actions (✅ tested on a live CAVZRC 7.1.0, ⚠️ not tested yet):

- ✅ **Gallery: Clear all seats of the meeting**: removes every seat; people still in the call are seated again, ghosts are not. ⚠️ Not yet watched on the screens: people may move to another screen.
- ✅ **Gallery: Delete seat**: removes one seat (meant to match the X in the CAVZRC Gallery Assignments window; not compared side by side).
- ✅ **Gallery: Set distribution mode**.
- ⚠️ **Gallery: Assign participant to seat**, **Swap two seats**, **Reload assignments from CSV**.
- ⚠️ **Gallery: Exclude self / hosts / no-video** and **Exclude participant by name**. These are the CAVZRC 7.1 API options; they may not be the same setting as the host exclusion in the CAVZRC window.
- **Gallery: Set meeting ID**: a field where you type the meeting ID by hand. The module never fills it on its own.

**The meeting ID cannot be read from CAVZRC or Companion.** CAVZRC never sends it out, so neither this module nor Companion can find out which meeting the room is in. The seat actions still need it, so it has to be given by hand: type it in the action, or store it once per meeting with **Gallery: Set meeting ID** (it is shown in the CAVZRC Gallery Assignments dropdown). Leave a seat action's field blank to use that stored value, `room_N_meeting_id`. The only exception is a meeting joined with this module's own **Join meeting** action: the module keeps the ID you typed in that action. It is cleared when the room goes back to an idle status (⚠️ the module expects "Idle" or "Not in meeting"; not yet confirmed on live traffic).

New feedbacks: **Gallery has "not joined" seats** and **Gallery distribution mode is**.

### HWIO layout

⚠️ The HWIO layout actions are not tested on a live CAVZRC yet; reading the layout back is.

- **HWIO: Set tile aspect ratio**: one or more channels (`1,3,4,5`), with a ratio that matches the current gallery grid (recommended), a preset per layout, or a custom value.
- **HWIO: Set gallery grid size**: the "Hardware output gallery size", optionally with the matching aspect ratio.
- **HWIO: Get layout settings**.

Aspect ratios that fill a 1920x1080 output: 1x1, 2x2, 3x3, 4x4 = 1.778 · 1x2 = 0.889 · 2x1 = 3.556 · 2x3 = 1.185 · 3x4 = 1.333.
Channels are changed one at a time ("Wait between channels", default 250 ms), and after a grid change the module waits first ("Wait after the grid change", default 500 ms), so CAVZRC re-lays out one output at a time.

### Channels by name

CAVZRC commands only take a channel number, but the **Channel** field of the HWIO, NDI and Dante actions now accepts a variable. With **HWIO channel routing** polling on, each named HWIO channel gets `$(cavzrc:room_N_hwio_<name>_channel)` holding its number (name lowercased, anything but letters and digits becomes `_`; "Screen A-1" → `room_1_hwio_screen_a_1_channel`). Put that variable in the Channel field and the button follows the screen even if its number changes. If the name is unknown the variable is empty and the action sends nothing (it logs an error) rather than falling back to channel 1. ✅ Tested live with one variable in HWIO: Content gallery and HWIO: Select gallery.

Every HWIO, NDI and Dante channel action (content off, test signal, participant, active speaker, gallery, screenshare, spotlight, pin group, the selections, mode, resolution, audio mix…) also has an optional **Several channels** box: tick it and list channels (`1,3,$(cavzrc:room_1_hwio_screen_b_channel)`). They are sent one after the other, **Wait between channels** apart (default 250 ms, editable); an entry that is not a number, such as an unknown name, is skipped with a warning. ⚠️ Not tested live yet.

### Install this fork in Companion

1. Download the module package (`zoom-cavzrc-<version>.tgz`) built from this repository, or build it: `npm install`, `npx tsc -p tsconfig.build.json`, `npx companion-module-build`.
2. Extract it and copy the contents of its `pkg` folder into Companion's developer modules folder, e.g. `%AppData%\companion\dev\zoom-cavzrc\` on Windows.
3. Quit Companion from the tray and start it again. The connection shows the new version (0.9.0) and the per-query polling settings.

**Repository (upstream):** [github.com/bitfocus/companion-module-zoom-cavzrc](https://github.com/bitfocus/companion-module-zoom-cavzrc)

---

## Configuration

Add a connection in Companion: **Connections** → **Add connection** → **Zoom** → **CAVZRC Companion module** (or **CAVZRC**). Then set:

| Field | Meaning |
| ------- | -------- |
| **CAVZRC host (IP)** | IP of the machine running CAVZRC (use `127.0.0.1` if Companion and CAVZRC are on the same machine). |
| **CAVZRC Receiving Port** | Must match CAVZRC’s **Receiving Port** (Companion sends commands here). |
| **Companion listen port** | Must match CAVZRC’s **Transmission Port** (CAVZRC sends status/feedback here). Use **0** to disable feedback and variables. |
| **OSC output header** | Must match CAVZRC’s **OSC Output Header** (default `/roomosc`). |

**In CAVZRC:** Set **Transmission IP** to the machine running Companion (e.g. `127.0.0.1` for same machine), and **Transmission Port** to the same value as **Companion listen port** above. Set **Receiving Port** to the same value as **CAVZRC Receiving Port** above.

**Room targeting:** Most actions can target a single room by **Room ID**, **Room name**, or **Room index** (1-based), or **All rooms**.

---

## What the module can do

The module exposes CAVZRC’s OSC controls so you can drive Zoom Rooms from Companion buttons, feedbacks, and variables.

### Join / leave

- **Join meeting** — Join by meeting ID (and optional password, user name). Target one room or all rooms. A 10-second cooldown is enforced between join attempts for the same room target to prevent Zoom from locking the room out after repeated wrong-passcode attempts (see [Join attempt rate limiting](#join-attempt-rate-limiting) below).
- **Start meeting** — Start an instant meeting. Target one room or all rooms.
- **Leave meeting** — Leave the current meeting. Target one room or all rooms.
- **Reset join attempt limit** — Immediately clear the join cooldown for a specific room target or all rooms, allowing a new attempt without waiting.

### Room list (global)

- **Get added room list** — Request the list of added rooms from CAVZRC.
- **Get paired room list** — Request the list of paired rooms.
- **Get added room count** / **Get paired room count** — Request counts.

### NDI

- Set NDI channel **content**: Off, Participant, Active Speaker, Gallery, Screenshare, Spotlight, Pin Group.
- Set **participant**, **gallery**, **screenshare**, or **pin group** selection (with index) for a channel.
- **Get NDI channel config** / **Get NDI channel count** — Query NDI setup.

### HWIO (hardware I/O)

- Set **mode** (e.g. pass-through, mix).
- Set **input selection** and **content**: Off, Test Signal, Participant, Active Speaker, Gallery, Screenshare, Spotlight, Pin Group.
- Set **resolution/frame rate**, **audio mix**, and participant/gallery/screenshare/pin selection per channel.
- **Get HWIO channel config** / **channel count** / **supported resolution and frame rate**.

### Dante

- Set Dante channel **content**: Off, Participant, Mix, Screenshare; set **participant selection** (with index).
- **Get Dante channel config** / **channel count**.

### Device (per room)

- **Mic:** Set room mic (by name), get mic list, **mute** / **unmute** mic, get selected mic.
- **Camera:** Set **main camera**, set **multi-camera on/off** (by name), **start** / **stop** camera, get camera list, get selected primary/multi cameras, **set camera display name**.
- **Speaker:** Set room speaker (by name), get speaker list, get selected speaker.

### Overlays (per room)

- **Name tag:** Enable/disable name tag overlay; **set name tag alignment** (left/center/right).
- **Emoji**, **hand raise**, **active speaker** overlays — enable/disable each.
- **Get overlay settings** — Query current overlay state.

### Content share (per room)

- **Start device share** / **Start camera share** (with optional camera name) / **Stop share**.

### Room / meeting (per room)

- **Get room info**, **participant count**, **meeting status**.
- **Activate camera preset** (by preset index).
- **Pair room** / **Unpair room**.
- **Rename participant** (current name → new name).
- **Set active speaker** — self or a participant by name.

### Companion rooms (Companion Room feature)

- **Get companion room list** — List Companion rooms.
- **Get companion room camera list** (by companion room ID).
- **Set companion room camera display name** / **camera off** / **camera on** (by companion room ID and camera device name).

---

## Feedbacks

- **Room is paired** — True when the chosen room is in the paired list.
- **In meeting** — True when the chosen room is in a meeting ("In Meeting", not "connecting").
- **Gallery has "not joined" seats** — True when the gallery has more named seats than participants plus the room.
- **Gallery distribution mode is** — True when the room uses the chosen mode.
- **HWIO channel active** / **HWIO channel selection matches** — React to routing changes.
- **Mic unmuted** — True when the room mic is unmuted.
- **Camera on** — True when the room camera is on.

Room options for feedbacks are filled from the list of paired/added rooms reported by CAVZRC.

---

## Variables

Updated from CAVZRC when the **Companion listen port** is set (non-zero):

- **added_rooms_count**, **paired_rooms_count** — Counts of added and paired rooms.
- **added_rooms_list**, **paired_rooms_list** — Comma-separated room names.
- **room_1** … **room_10** — Per-room: **id**, **cavzrc_index**, **name**, **meeting_status**, **participant_count**, **mute** (Muted/Unmuted), **camera** (On/Off), **ndi_count** / **hwio_count** / **dante_count**.
- Gallery, per room: **meeting_id** (only what was typed in Join meeting or Set meeting ID, never read from CAVZRC), **gallery_mode**, **gallery_seats**, **gallery_ghosts** (estimated "not joined" seats), **gallery_names**, **grid_size** (e.g. `1x2`), **exclude_self**, **exclude_hosts**, **exclude_no_video**.
- Channels, per room: `room_N_hwio_<name>_active/mode/content/selection/resolution_fps/audio_mix/channel`, `room_N_ndi_<index>_*`, `room_N_dante_<index>_*`. `_channel` is the HWIO channel number, useful when channels move after a restart.

Use these in button labels, stream deck text, or conditional logic.

---

## Join attempt rate limiting

When a **Join meeting** action is triggered with an incorrect passcode, Zoom Rooms caches the bad passcode and CAVZRC may retry the join internally. If this happens too many times, Zoom locks the room out of that meeting entirely — even blocking subsequent manual join attempts from the room controller.

To prevent this, the module enforces a **10-second cooldown per room target** after each join attempt. If a second join command arrives for the same target within 10 seconds (e.g. from a held button, a rapid trigger, or an automation), it is silently dropped and a warning is logged in Companion.

The cooldown resets automatically when the room successfully enters a meeting. It can also be cleared immediately using the **Reset join attempt limit** action, which is useful when you have corrected a wrong passcode and want to retry without waiting.

> **Note:** The cooldown prevents Companion from spamming join commands, but it cannot prevent CAVZRC from retrying internally after receiving a single command. If you enter a wrong passcode, Zoom Rooms will cache it. Clearing that cached passcode requires action on the machine running Zoom Rooms — it is not something the Companion module can control.

### Clearing a cached wrong passcode

If a bad passcode has been cached and manual join attempts fail before you can enter a new passcode, clear the Zoom app cache on the machine running Zoom Rooms:

1. Click the **Finder** icon in the Dock (or press **⌘ + Space** and search for Finder).
2. In the menu bar, click **Go** → **Go to Folder**.
3. Enter `/Library/Application Support/zoom.us` and press Return.
4. Right-click the **data** folder and select **Move to Trash**.
5. Restart Zoom Rooms.

This removes the locally cached meeting credentials and allows a clean join attempt.

---

## License

MIT. See [LICENSE](LICENSE) in this repository.
