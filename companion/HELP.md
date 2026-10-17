# Zoom Rooms (CAVZRC) Module

Control **Custom AV for Zoom Rooms Controller (CAVZRC)** via its OSC API. Commands are sent to the CAVZRC application (not directly to the Zoom Room device), allowing control over multiple Zoom Rooms and over the WAN.

**Note:** The CAVZRC OSC API is currently in **Beta**.

## Requirements

- Zoom Rooms version **6.5.0** or later
- **Custom AV Zoom Rooms Controller 1.2.0** or later (7.1.0 for the gallery grid size and exclude options)

## Configuration

- **Host** — IP address of the machine running CAVZRC (where this module sends OSC commands).
- **tx_port** — CAVZRC "Receiving Port" (port where CAVZRC listens for incoming OSC).
- **rx_port** — Port where Companion listens for OSC **outputs** from CAVZRC (set to 0 to disable listening for feedbacks/variables).
- **OSC output header** — Must match the "OSC Output Header" setting in CAVZRC (default: `/roomosc`).

In CAVZRC, configure **Transmission IP** and **Transmission Port** to point to the machine running Companion and the **rx_port** value above, so that CAVZRC can send status and events back to this module.

## Polling

Each query has its own setting (Off, on connect, or an interval):

- **Meeting status**: default every 5 s.
- **Participant count**: default every 2.5 s, only while the room is in a meeting.
- **Gallery seats and ghost count**: default every 10 s, only while in a meeting.
- **Gallery mode, grid size and exclude options**: default every 30 s.
- **HWIO channel routing**: default on connect. Reads every HWIO channel one by one and fills
  `room_N_hwio_<name>_channel` with the channel number, so a remap after a Mac restart is visible.
- **Room lists**: on connect, and again automatically when a reply arrives from a room the module does not know.

Mute and camera status need no polling: CAVZRC sends them when they change.
The **Refresh all now** action asks for everything once. Connections from an older build keep their
old "Poll Interval" for meeting status and participant count.

## Gallery ("not joined" seats)

In Assigned distribution mode a seat keeps a person's name after they leave or rename.

- `room_N_gallery_seats`, `room_N_gallery_names`: the seat list CAVZRC reports, ghosts included.
- `room_N_gallery_ghosts`: named seats minus participants minus the room's own seat. An estimate:
  CAVZRC does not say which seats are joined.
- Feedback **Gallery has "not joined" seats** lights a button when that count is above 0.
- **Gallery: Clear all seats of the meeting** removes every seat; people still in the call are seated
  again, ghosts are not. **Gallery: Delete seat** removes one seat (the X in the CAVZRC window).

These actions need the meeting ID. Leave the field blank to use `room_N_meeting_id`, which is set by
**Join meeting** and by **Gallery: Set meeting ID** (for meetings started from the tablet), and is
cleared when the meeting ends. CAVZRC never reports the meeting ID itself.

**HWIO: Set gallery grid size** can also set the tile aspect ratio that fills each listed output
(1x2 on 1920x1080 = 0.889, 2x2 = 1.778, 2x3 = 1.185).

## Target types (room commands)

Room-targeted actions can target Zoom Rooms by:

- **roomID** — Unique room ID (string).
- **roomName** — Display name of the room (string).
- **roomIndex** — One-based index in the list of rooms added to CAVZRC (the same number as `room_N_cavzrc_index`).
- **allRooms** — Apply to all rooms added to CAVZRC.

## Variables and feedbacks

- **Variables**: Added/paired room count and list; per-room (room 1–10) ID, name, meeting status, participant count, mute and camera status. Populated when CAVZRC sends OSC outputs to this module (configure rx_port and CAVZRC Transmission settings).
- **Feedbacks**: Room paired, in meeting (only "In Meeting", not "connecting"), mic unmuted, camera on, gallery has "not joined" seats, gallery mode is. Room dropdown is filled from the paired or added room list after you request room lists (e.g. Get added room list / Get paired room list).

## References

- Zoom Custom AV for Zoom Rooms Controller (CAVZRC) and its OSC API documentation.
- [Companion developer docs](https://companion.free/for-developers/).

## Channel status (NDI / HWIO / Dante)

CAVZRC reports channel configuration replies (`channelConfig*`, `channelCount*`)
are parsed into room state and exposed as:

- `room_N_ndi_count` / `room_N_hwio_count` / `room_N_dante_count` — channel counts
- `room_N_ndi_<index>_status/content/selection` — NDI channel details
- `room_N_hwio_<name>_active/mode/content/selection/resolution_fps/audio_mix`
  — HWIO channel details, keyed by the CAVZRC channel name (lowercased,
  non-alphanumerics become `_`)
- `room_N_dante_<index>_status/content/selection/signal` — Dante channel details

Feedbacks: "HWIO channel active" and "HWIO channel selection matches" let
buttons/triggers react to routing changes (e.g. detect a frozen or unrouted
screen).

## Connection health

"No-data warning" (config): when listening and no OSC arrives from CAVZRC for
the configured silence window, the connection is marked failed and a probe is
sent. Data arriving restores the status automatically.
