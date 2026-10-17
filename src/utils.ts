import type { InstanceBase } from '@companion-module/base'
import type { ZoomRoomsConfig } from './config.js'
import type { OSC } from './osc.js'

export type TargetType = 'roomID' | 'roomName' | 'roomIndex' | 'allRooms'

export interface RoomInfo {
	roomID: string
	roomName: string
	roomIndex: number
}

export interface NdiChannelConfig {
	status: number
	content: string
	selection: string
}

export interface HwioChannelConfig {
	isActive: boolean
	channelName: string
	mode: number
	content: number
	selection: string
	resolutionFps: string
	audioMix: number
}

export interface DanteChannelConfig {
	status: number
	content: string
	selection: string
	signal: string
}

export interface RoomState {
	roomID: string
	roomName: string
	roomIndex: number
	meetingStatus?: string
	participantCount?: number
	muteStatus?: boolean
	cameraStatus?: boolean
	selectedPrimaryCamera?: string
	selectedMic?: string
	selectedSpeaker?: string
	ndiChannelCount?: number
	hwioChannelCount?: number
	danteChannelCount?: number
	ndiChannels?: Record<number, NdiChannelConfig>
	hwioChannels?: Record<string, HwioChannelConfig>
	danteChannels?: Record<number, DanteChannelConfig>
	/** Meeting ID last sent with "Join meeting" or "Gallery: Set meeting ID"; cleared when the meeting ends. */
	meetingId?: string
	galleryMode?: string
	/** Seat names in seat order (seat 1 is usually the room itself), ghosts included. */
	gallerySeats?: string[]
	galleryGridRows?: number
	galleryGridCols?: number
	excludeSelf?: boolean
	excludeHostCoHost?: boolean
	excludeNonVideo?: boolean
	/** HWIO channel number each channel name was last read from (filled by the routing refresh). */
	hwioChannelNumbers?: Record<string, number>
	overlayConfig?: {
		namePosition: number
		showNametag: boolean
		showEmoji: boolean
		showHand: boolean
		showBorder: boolean
	}
}

/** CAVZRC meeting status strings vary in case and spacing ("In Meeting", "in_meeting"). */
export function isInMeetingStatus(status: string | undefined): boolean {
	return (status ?? '').toLowerCase().replace(/[\s_-]/g, '') === 'inmeeting'
}

/** Idle states. "connecting" is neither in nor out of a meeting. */
export function isOutOfMeetingStatus(status: string | undefined): boolean {
	const s = (status ?? '').toLowerCase().replace(/[\s_-]/g, '')
	return s === 'idle' || s === 'notinmeeting'
}

/** Ghost ("not joined") seats: named seats beyond the participants plus the room's own seat. */
export function ghostSeatCount(room: RoomState | undefined): number | undefined {
	if (!room?.gallerySeats || room.participantCount === undefined) return undefined
	return Math.max(0, room.gallerySeats.length - room.participantCount - 1)
}

export interface CavzrcState {
	addedRooms: RoomInfo[]
	pairedRooms: RoomInfo[]
	addedRoomsCount: number
	pairedRoomsCount: number
	rooms: Record<string, RoomState>
}

export function createDefaultState(): CavzrcState {
	return {
		addedRooms: [],
		pairedRooms: [],
		addedRoomsCount: 0,
		pairedRoomsCount: 0,
		rooms: {},
	}
}

export interface ZoomRoomsInstance extends InstanceBase<ZoomRoomsConfig> {
	config: ZoomRoomsConfig
	state: CavzrcState
	OSC: OSC | null
	updateVariableValues: () => void
	refreshVariableDefinitions: () => void
}
