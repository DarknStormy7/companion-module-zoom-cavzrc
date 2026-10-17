import type { CompanionVariableDefinition } from '@companion-module/base'
import type { ZoomRoomsInstance, RoomState } from '../utils.js'

/** Sanitize an HWIO channel name into a variable-id-safe slug. */
export function channelSlug(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
}

/** Full definition list: base globals, per-room slots, and channel details. */
export function GetVariableDefinitions(instance: ZoomRoomsInstance): CompanionVariableDefinition[] {
	const definitions: CompanionVariableDefinition[] = [
		{ variableId: 'added_rooms_count', name: 'Added rooms count' },
		{ variableId: 'paired_rooms_count', name: 'Paired rooms count' },
		{ variableId: 'added_rooms_list', name: 'Added rooms list (names)' },
		{ variableId: 'paired_rooms_list', name: 'Paired rooms list (names)' },
	]
	for (let n = 1; n <= 10; n++) {
		definitions.push({ variableId: `room_${n}_id`, name: `Room ${n} ID` })
		definitions.push({ variableId: `room_${n}_cavzrc_index`, name: `Room ${n} CAVZRC list index` })
		definitions.push({ variableId: `room_${n}_name`, name: `Room ${n} name` })
		definitions.push({ variableId: `room_${n}_meeting_status`, name: `Room ${n} meeting status` })
		definitions.push({ variableId: `room_${n}_participant_count`, name: `Room ${n} participant count` })
		definitions.push({ variableId: `room_${n}_mute`, name: `Room ${n} mute status` })
		definitions.push({ variableId: `room_${n}_camera`, name: `Room ${n} camera status` })
		definitions.push({ variableId: `room_${n}_ndi_count`, name: `Room ${n} NDI channel count` })
		definitions.push({ variableId: `room_${n}_hwio_count`, name: `Room ${n} HWIO channel count` })
		definitions.push({ variableId: `room_${n}_dante_count`, name: `Room ${n} Dante channel count` })
		definitions.push({ variableId: `room_${n}_meeting_id`, name: `Room ${n} meeting ID (from Join or Set meeting ID)` })
		definitions.push({ variableId: `room_${n}_gallery_mode`, name: `Room ${n} gallery distribution mode` })
		definitions.push({ variableId: `room_${n}_gallery_seats`, name: `Room ${n} gallery named seats` })
		definitions.push({ variableId: `room_${n}_gallery_ghosts`, name: `Room ${n} gallery "not joined" seats` })
		definitions.push({ variableId: `room_${n}_gallery_names`, name: `Room ${n} gallery seat names` })
		definitions.push({ variableId: `room_${n}_grid_size`, name: `Room ${n} HWIO gallery grid size` })
		definitions.push({ variableId: `room_${n}_exclude_self`, name: `Room ${n} gallery excludes self` })
		definitions.push({ variableId: `room_${n}_exclude_hosts`, name: `Room ${n} gallery excludes hosts/co-hosts` })
		definitions.push({ variableId: `room_${n}_exclude_no_video`, name: `Room ${n} gallery excludes no-video` })
	}

	// Channel detail variables are derived from what CAVZRC has actually
	// reported, keyed by the room's positional slot (1..N by sorted index).
	const slots = [...instance.state.pairedRooms].sort((a, b) => (a.roomIndex ?? 11) - (b.roomIndex ?? 11))
	slots.forEach((info, position) => {
		const n = position + 1
		if (n > 10) return
		const room: RoomState | undefined = instance.state.rooms[info.roomID]
		if (!room) return

		for (const [idx, ch] of Object.entries(room.ndiChannels ?? {})) {
			definitions.push({ variableId: `room_${n}_ndi_${idx}_status`, name: `Room ${n} NDI ${idx} status` })
			definitions.push({ variableId: `room_${n}_ndi_${idx}_content`, name: `Room ${n} NDI ${idx} content` })
			definitions.push({ variableId: `room_${n}_ndi_${idx}_selection`, name: `Room ${n} NDI ${idx} selection` })
			void ch
		}
		for (const [name, ch] of Object.entries(room.hwioChannels ?? {})) {
			const s = channelSlug(name)
			if (!s) continue
			definitions.push({ variableId: `room_${n}_hwio_${s}_active`, name: `Room ${n} HWIO ${name} active` })
			definitions.push({ variableId: `room_${n}_hwio_${s}_mode`, name: `Room ${n} HWIO ${name} mode` })
			definitions.push({ variableId: `room_${n}_hwio_${s}_content`, name: `Room ${n} HWIO ${name} content` })
			definitions.push({ variableId: `room_${n}_hwio_${s}_selection`, name: `Room ${n} HWIO ${name} selection` })
			definitions.push({
				variableId: `room_${n}_hwio_${s}_resolution_fps`,
				name: `Room ${n} HWIO ${name} resolution/fps`,
			})
			definitions.push({ variableId: `room_${n}_hwio_${s}_audio_mix`, name: `Room ${n} HWIO ${name} audio mix` })
			if (room.hwioChannelNumbers?.[name] !== undefined) {
				definitions.push({ variableId: `room_${n}_hwio_${s}_channel`, name: `Room ${n} HWIO ${name} channel number` })
			}
			void ch
		}
		for (const [idx, ch] of Object.entries(room.danteChannels ?? {})) {
			definitions.push({ variableId: `room_${n}_dante_${idx}_status`, name: `Room ${n} Dante ${idx} status` })
			definitions.push({ variableId: `room_${n}_dante_${idx}_content`, name: `Room ${n} Dante ${idx} content` })
			definitions.push({ variableId: `room_${n}_dante_${idx}_selection`, name: `Room ${n} Dante ${idx} selection` })
			definitions.push({ variableId: `room_${n}_dante_${idx}_signal`, name: `Room ${n} Dante ${idx} signal` })
			void ch
		}
	})

	return definitions
}

export function initVariableDefinitions(instance: ZoomRoomsInstance): void {
	instance.setVariableDefinitions(GetVariableDefinitions(instance))
}
