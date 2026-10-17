import type { CompanionVariableValues } from '@companion-module/base'
import type { ZoomRoomsInstance } from '../utils.js'
import { ghostSeatCount } from '../utils.js'
import { channelSlug } from './variable-definitions.js'

const MAX_ROOM_SLOTS = 10
const ROOM_SLOT_FIELDS = [
	'id',
	'cavzrc_index',
	'name',
	'meeting_status',
	'participant_count',
	'mute',
	'camera',
	'ndi_count',
	'hwio_count',
	'dante_count',
	'meeting_id',
	'gallery_mode',
	'gallery_seats',
	'gallery_ghosts',
	'gallery_names',
	'grid_size',
	'exclude_self',
	'exclude_hosts',
	'exclude_no_video',
]

const yesNo = (v: boolean | undefined) => (v === true ? 'Yes' : v === false ? 'No' : '—')

export function updateAddedRoomsCount(instance: ZoomRoomsInstance, variables: CompanionVariableValues): void {
	variables['added_rooms_count'] = instance.state.addedRoomsCount
}

export function updatePairedRoomsCount(instance: ZoomRoomsInstance, variables: CompanionVariableValues): void {
	variables['paired_rooms_count'] = instance.state.pairedRoomsCount
}

export function updateAddedRoomsList(instance: ZoomRoomsInstance, variables: CompanionVariableValues): void {
	variables['added_rooms_list'] =
		instance.state.addedRooms
			.map((r) => r.roomName)
			.filter(Boolean)
			.join(', ') || '—'
}

export function updatePairedRoomsList(instance: ZoomRoomsInstance, variables: CompanionVariableValues): void {
	variables['paired_rooms_list'] =
		instance.state.pairedRooms
			.map((r) => r.roomName)
			.filter(Boolean)
			.join(', ') || '—'
}

export function updateVariableValues(instance: ZoomRoomsInstance): void {
	const variables: CompanionVariableValues = {}
	updateAddedRoomsCount(instance, variables)
	updatePairedRoomsCount(instance, variables)
	updateAddedRoomsList(instance, variables)
	updatePairedRoomsList(instance, variables)
	const state = instance.state

	// Assign rooms to slots 1..N positionally, ordered by the CAVZRC list
	// index. CAVZRC roomIndex values cannot be trusted as direct slot
	// numbers (they may arrive unordered, out of range, or missing), which
	// previously landed room data on the wrong room_N_* variables — most
	// visibly participant counts. Unindexed rooms sort last, deterministically.
	const sorted = [...state.pairedRooms].sort(
		(a, b) => (a.roomIndex ?? MAX_ROOM_SLOTS + 1) - (b.roomIndex ?? MAX_ROOM_SLOTS + 1),
	)
	sorted.forEach((r, position) => {
		const n = position + 1
		if (n > MAX_ROOM_SLOTS) return
		variables[`room_${n}_id`] = r.roomID
		variables[`room_${n}_cavzrc_index`] = r.roomIndex ?? '—'
		variables[`room_${n}_name`] = r.roomName || '—'
		const room = state.rooms[r.roomID]
		variables[`room_${n}_meeting_status`] = room?.meetingStatus ?? '—'
		variables[`room_${n}_participant_count`] = room?.participantCount ?? '—'
		variables[`room_${n}_mute`] = room?.muteStatus === true ? 'Unmuted' : room?.muteStatus === false ? 'Muted' : '—'
		variables[`room_${n}_camera`] = room?.cameraStatus === true ? 'On' : room?.cameraStatus === false ? 'Off' : '—'
		variables[`room_${n}_ndi_count`] = room?.ndiChannelCount ?? '—'
		variables[`room_${n}_hwio_count`] = room?.hwioChannelCount ?? '—'
		variables[`room_${n}_dante_count`] = room?.danteChannelCount ?? '—'
		variables[`room_${n}_meeting_id`] = room?.meetingId || '—'
		variables[`room_${n}_gallery_mode`] = room?.galleryMode || '—'
		variables[`room_${n}_gallery_seats`] = room?.gallerySeats?.length ?? '—'
		variables[`room_${n}_gallery_ghosts`] = ghostSeatCount(room) ?? '—'
		variables[`room_${n}_gallery_names`] = room?.gallerySeats?.join(', ') || '—'
		variables[`room_${n}_grid_size`] =
			room?.galleryGridRows !== undefined && room.galleryGridCols !== undefined
				? `${room.galleryGridRows}x${room.galleryGridCols}`
				: '—'
		variables[`room_${n}_exclude_self`] = yesNo(room?.excludeSelf)
		variables[`room_${n}_exclude_hosts`] = yesNo(room?.excludeHostCoHost)
		variables[`room_${n}_exclude_no_video`] = yesNo(room?.excludeNonVideo)

		// Channel detail values (definitions are refreshed by osc.ts when a
		// new channel key first appears; values are written on every update).
		if (room) {
			for (const [idx, ch] of Object.entries(room.ndiChannels ?? {})) {
				variables[`room_${n}_ndi_${idx}_status`] = ch.status
				variables[`room_${n}_ndi_${idx}_content`] = ch.content || '—'
				variables[`room_${n}_ndi_${idx}_selection`] = ch.selection || '—'
			}
			for (const [name, ch] of Object.entries(room.hwioChannels ?? {})) {
				const s = channelSlug(name)
				if (!s) continue
				variables[`room_${n}_hwio_${s}_active`] = ch.isActive ? 'Active' : 'Inactive'
				variables[`room_${n}_hwio_${s}_mode`] = ch.mode === 1 ? 'Output' : ch.mode === 2 ? 'Input' : String(ch.mode)
				variables[`room_${n}_hwio_${s}_content`] = ch.content || 0
				variables[`room_${n}_hwio_${s}_selection`] = ch.selection || '—'
				variables[`room_${n}_hwio_${s}_resolution_fps`] = ch.resolutionFps || '—'
				variables[`room_${n}_hwio_${s}_audio_mix`] = ch.audioMix
				const channelNumber = room.hwioChannelNumbers?.[name]
				if (channelNumber !== undefined) variables[`room_${n}_hwio_${s}_channel`] = channelNumber
			}
			for (const [idx, ch] of Object.entries(room.danteChannels ?? {})) {
				variables[`room_${n}_dante_${idx}_status`] = ch.status
				variables[`room_${n}_dante_${idx}_content`] = ch.content || '—'
				variables[`room_${n}_dante_${idx}_selection`] = ch.selection || '—'
				variables[`room_${n}_dante_${idx}_signal`] = ch.signal || '—'
			}
		}
	})

	// Clear slots above the current room count so removed/unpaired rooms
	// do not leave stale variables behind.
	for (let k = sorted.length + 1; k <= MAX_ROOM_SLOTS; k++) {
		for (const field of ROOM_SLOT_FIELDS) variables[`room_${k}_${field}`] = '—'
	}

	instance.setVariableValues(variables)
}
