import { InstanceStatus } from '@companion-module/base'
import type { CompanionVariableValues } from '@companion-module/base'
import { UDPPort } from 'osc'
import type { OscArgument } from 'osc'
import type { ZoomRoomsInstance, RoomState } from './utils.js'
import { isInMeetingStatus, isOutOfMeetingStatus } from './utils.js'
import {
	updateAddedRoomsCount,
	updatePairedRoomsCount,
	updateAddedRoomsList,
	updatePairedRoomsList,
} from './variables/variable-values.js'
import { FeedbackIdRoomStatus } from './feedbacks/feedback-room-status.js'
import { FeedbackIdChannelStatus } from './feedbacks/feedback-channels.js'
import { FeedbackIdGallery } from './feedbacks/feedback-gallery.js'

const JOIN_COOLDOWN_MS = 10_000
const STALENESS_CHECK_MS = 10_000
const ROOM_LIST_RECOVERY_MS = 10_000
/** Gap between getHWIOChannelConfig requests, so each reply can be matched to its channel number. */
const ROUTING_REQUEST_GAP_MS = 150

/** sendCommand argument; numbers are sent as int unless wrapped as { type: 'f' }. */
export type OscSendArg = string | number | boolean | { type: 'f'; value: number }

interface SeatBuffer {
	size: number
	lastIndex: number
	seats: Map<number, string>
}

export class OSC {
	private readonly instance: ZoomRoomsInstance
	private udpPort: UDPPort | null = null
	private pollTimers: ReturnType<typeof setInterval>[] = []
	private routingTimers: ReturnType<typeof setTimeout>[] = []
	private roomListInterval: ReturnType<typeof setInterval> | null = null
	private stalenessInterval: ReturnType<typeof setInterval> | null = null
	private lastHeardAt: number = Date.now()
	private staleWarned = false
	private lastJoinAttempt: Map<string, number> = new Map()
	private lastPairedListIndex = Number.MAX_SAFE_INTEGER
	private lastAddedListIndex = Number.MAX_SAFE_INTEGER
	private lastRoomListRecovery = 0
	private routingPending: Set<string> = new Set()
	private routingQueue: Map<string, number[]> = new Map()
	private seatBuffers: Map<string, SeatBuffer> = new Map()

	constructor(instance: ZoomRoomsInstance) {
		this.instance = instance
		this.connect()
	}

	private get host(): string {
		return this.instance.config.host || '127.0.0.1'
	}

	private get txPort(): number {
		return this.instance.config.tx_port || 9090
	}

	private get rxPort(): number {
		return this.instance.config.rx_port || 0
	}

	private get outputHeader(): string {
		const h = this.instance.config.oscOutputHeader || '/roomosc'
		return h.startsWith('/') ? h : `/${h}`
	}

	public canAttemptJoin(targetKey: string): boolean {
		const last = this.lastJoinAttempt.get(targetKey)
		return last === undefined || Date.now() - last >= JOIN_COOLDOWN_MS
	}

	private roomGet(roomID: string, command: string, args: OscSendArg[] = []): void {
		this.sendCommand(`/zoomRooms/roomID/${command}`, [roomID, ...args])
	}

	private pairedRoomIDs(): string[] {
		return this.instance.state.pairedRooms.map((r) => r.roomID).filter(Boolean)
	}

	/** In-meeting data is asked for while the room is in a meeting, or when its status is unknown. */
	private mayBeInMeeting(roomID: string): boolean {
		const status = this.instance.state.rooms[roomID]?.meetingStatus
		return status === undefined || isInMeetingStatus(status)
	}

	public pollMeetingStatus(): void {
		for (const id of this.pairedRoomIDs()) this.roomGet(id, 'getMeetingStatus')
	}

	public pollParticipantCount(): void {
		for (const id of this.pairedRoomIDs()) {
			if (this.mayBeInMeeting(id)) this.roomGet(id, 'getParticipantCount')
		}
	}

	public pollGallerySeats(): void {
		for (const id of this.pairedRoomIDs()) {
			if (this.mayBeInMeeting(id)) this.roomGet(id, 'getMeetingGalleryOrder')
		}
	}

	public refreshGallerySettings(roomID?: string): void {
		for (const id of roomID ? [roomID] : this.pairedRoomIDs()) {
			this.roomGet(id, 'getGalleryDistributionMode')
			this.roomGet(id, 'getHWIOGalleryGridSize')
			this.roomGet(id, 'getGalleryExcludeOptions')
		}
	}

	/** Ask for the HWIO channel count; the reply triggers one config request per channel. */
	public refreshChannelRouting(roomID?: string): void {
		for (const id of roomID ? [roomID] : this.pairedRoomIDs()) {
			this.routingPending.add(id)
			this.roomGet(id, 'getHWIOChannelCount')
		}
	}

	/** Everything the module can ask for, once. Used by the "Refresh all now" action. */
	public refreshAll(): void {
		this.requestRoomLists()
		this.pollMeetingStatus()
		for (const id of this.pairedRoomIDs()) {
			this.roomGet(id, 'getParticipantCount')
			this.roomGet(id, 'getMeetingGalleryOrder')
		}
		this.refreshGallerySettings()
		this.refreshChannelRouting()
	}

	/** First data for a newly paired room: run the "on connect" queries for it. */
	private onRoomDiscovered(roomID: string): void {
		const c = this.instance.config
		if ((c.pollMeetingStatus ?? 0) !== 0) this.roomGet(roomID, 'getMeetingStatus')
		if ((c.pollGallerySettings ?? 0) !== 0) this.refreshGallerySettings(roomID)
		if ((c.pollChannelRouting ?? 0) !== 0) this.refreshChannelRouting(roomID)
	}

	private startPolling(): void {
		const c = this.instance.config
		const every = (ms: number | undefined, fn: () => void) => {
			if (ms && ms > 0) this.pollTimers.push(setInterval(fn, ms))
		}
		every(c.pollMeetingStatus, () => this.pollMeetingStatus())
		every(c.pollParticipantCount, () => this.pollParticipantCount())
		every(c.pollGallerySeats, () => this.pollGallerySeats())
		every(c.pollGallerySettings, () => this.refreshGallerySettings())
		every(c.pollChannelRouting, () => this.refreshChannelRouting())
	}

	/** Request both room lists. Called on connect and on the optional slow timer. */
	public requestRoomLists(): void {
		this.sendCommand('/zoomRooms/getAddedRoomList', [])
		this.sendCommand('/zoomRooms/getPairedRoomList', [])
	}

	public recordJoinAttempt(targetKey: string): void {
		this.lastJoinAttempt.set(targetKey, Date.now())
	}

	public resetJoinAttempts(targetKey?: string): void {
		if (targetKey !== undefined) {
			this.lastJoinAttempt.delete(targetKey)
		} else {
			this.lastJoinAttempt.clear()
		}
	}

	public sendCommand(path: string, args: OscSendArg[] = []): void {
		this.instance.log('debug', `Sending OSC command: ${path} ${JSON.stringify(args)}`)
		if (!this.udpPort) return
		const oscArgs = args.map((a) => {
			if (typeof a === 'object') return a
			if (typeof a === 'boolean') return { type: 'i', value: a ? 1 : 0 }
			if (typeof a === 'number') return Number.isInteger(a) ? { type: 'i', value: a } : { type: 'f', value: a }
			return { type: 's', value: String(a) }
		})
		try {
			this.udpPort.send({ address: path.startsWith('/') ? path : `/${path}`, args: oscArgs })
		} catch (e) {
			this.instance.log('error', `OSC send error: ${String(e)}`)
		}
	}

	private connect(): void {
		const rxPort = this.rxPort
		if (rxPort <= 0) {
			this.instance.log('info', 'rx_port is 0; not listening for OSC outputs')
		}

		const port = new UDPPort({
			localAddress: '0.0.0.0',
			localPort: rxPort > 0 ? rxPort : 0,
			remoteAddress: this.host,
			remotePort: this.txPort,
			metadata: true,
		})
		this.udpPort = port

		port.on('error', (err: Error) => {
			this.instance.updateStatus(InstanceStatus.UnknownError, `OSC socket error: ${err.message}`)
			if ((err as Error & { code?: string }).code === 'EADDRINUSE') {
				this.instance.log(
					'error',
					`Port ${rxPort} is already in use. Choose a different "Companion listen port" in this connection's config, or close the other app using that port.`,
				)
			} else {
				this.instance.log('error', `OSC socket error: ${err.message}`)
			}
		})

		if (rxPort > 0) {
			port.on('message', (msg) => {
				this.markHeard()
				this.handleMessage(msg.address, msg.args)
			})
			port.on('ready', () => {
				this.instance.log('info', `Listening for CAVZRC OSC on port ${rxPort}`)
				this.instance.updateStatus(InstanceStatus.Ok, `Listening for CAVZRC OSC on port ${rxPort}`)

				this.requestRoomLists()
				this.startPolling()

				const listInterval = this.instance.config.roomListInterval
				if (listInterval && listInterval > 0) {
					this.roomListInterval = setInterval(() => {
						this.requestRoomLists()
					}, listInterval)
				}

				// Staleness watchdog: CAVZRC pushes status on change and replies
				// to polls. If nothing arrives for stalenessTimeoutSec while we
				// are listening, warn and probe so a dead/unreachable CAVZRC is
				// visible instead of silently showing stale room data.
				const staleMs = (this.instance.config.stalenessTimeoutSec ?? 60) * 1000
				if (staleMs > 0) {
					this.lastHeardAt = Date.now()
					this.stalenessInterval = setInterval(() => {
						this.checkStaleness(staleMs)
					}, STALENESS_CHECK_MS)
				}
			})
		} else {
			this.instance.updateStatus(InstanceStatus.Ok, `Not listening for CAVZRC OSC (rx_port is 0)`)
		}

		port.open()
	}

	private handleMessage(address: string, args: OscArgument[]): void {
		this.instance.log('debug', `OSC message received: ${address} ${JSON.stringify(args)}`)
		const header = this.outputHeader
		if (!address.startsWith(header)) {
			return
		}
		const path = address.slice(header.length).replace(/^\/+/, '') || ''
		const state = this.instance.state

		if (path === 'addedRoomsCount') {
			const count = this.argInt(args, 0)
			if (count !== undefined) {
				state.addedRoomsCount = count
				const variables: CompanionVariableValues = {}
				updateAddedRoomsCount(this.instance, variables)
				this.instance.setVariableValues(variables)
			}
			return
		}
		if (path === 'pairedRoomsCount') {
			const count = this.argInt(args, 0)
			if (count !== undefined) {
				state.pairedRoomsCount = count
				const variables: CompanionVariableValues = {}
				updatePairedRoomsCount(this.instance, variables)
				this.instance.setVariableValues(variables)
			}
			return
		}
		if (path === 'addedRoomList' || path === 'addedRoomsList') {
			const maxList = this.argInt(args, 0)
			const thisIndex = this.argInt(args, 1)
			const roomID = this.argStr(args, 2)
			const roomName = this.argStr(args, 3)
			state.addedRoomsCount = maxList ?? 0
			if (roomID !== undefined && roomName !== undefined && thisIndex !== undefined) {
				// A list is resent from index 1: start over so removed rooms drop out.
				if (thisIndex <= this.lastAddedListIndex) state.addedRooms.length = 0
				this.lastAddedListIndex = thisIndex
				const exists = state.addedRooms.some((r) => r.roomID === roomID)
				if (!exists) {
					state.addedRooms.push({ roomID, roomName, roomIndex: thisIndex })
				}
				const variables: CompanionVariableValues = {}
				updateAddedRoomsList(this.instance, variables)
				updateAddedRoomsCount(this.instance, variables)
				this.instance.setVariableValues(variables)
			}
			return
		}
		if (path === 'pairedRoomList' || path === 'pairedRoomsList') {
			const maxList = this.argInt(args, 0)
			const thisIndex = this.argInt(args, 1)
			const roomID = this.argStr(args, 2)
			const roomName = this.argStr(args, 3)
			state.pairedRoomsCount = maxList ?? 0

			if (roomID !== undefined && roomName !== undefined && thisIndex !== undefined) {
				const known = new Set(state.pairedRooms.map((r) => r.roomID))
				if (thisIndex <= this.lastPairedListIndex) state.pairedRooms.length = 0
				this.lastPairedListIndex = thisIndex
				const exists = state.pairedRooms.some((r) => r.roomID === roomID)
				if (!exists) {
					state.pairedRooms.push({ roomID, roomName, roomIndex: thisIndex })
				}
				if (!known.has(roomID)) this.onRoomDiscovered(roomID)
				const variables: CompanionVariableValues = {}
				updatePairedRoomsList(this.instance, variables)
				updatePairedRoomsCount(this.instance, variables)
				this.instance.setVariableValues(variables)
				this.instance.checkFeedbacks(FeedbackIdRoomStatus.RoomPaired)
			}
			return
		}

		// Room-specific outputs: prefix is roomID, roomName, roomIndex
		const roomID = this.argStr(args, 0)
		const roomName = this.argStr(args, 1)
		const roomIndex = this.argInt(args, 2)
		if (roomID !== undefined && path) {
			const key = roomID
			if (!state.rooms[key]) {
				state.rooms[key] = { roomID, roomName: roomName ?? '', roomIndex: roomIndex ?? 0 }
			}
			const room = state.rooms[key]
			if (roomName !== undefined) room.roomName = roomName
			if (roomIndex !== undefined) room.roomIndex = roomIndex
			this.recoverUnknownRoom(roomID)

			if (path === 'meetingStatus') {
				const previous = room.meetingStatus
				const wasInMeeting = isInMeetingStatus(previous)
				room.meetingStatus = this.argStr(args, 3)
				const status = (room.meetingStatus || '').toLowerCase()
				if (status !== '' && status !== 'not in meeting' && status !== 'idle') {
					this.lastJoinAttempt.clear()
				}
				const inMeeting = isInMeetingStatus(room.meetingStatus)
				// Ended = left a meeting (or a join attempt) for idle; a repeated "idle" keeps a freshly joined ID.
				if (previous !== undefined && !isOutOfMeetingStatus(previous) && isOutOfMeetingStatus(room.meetingStatus)) {
					this.onMeetingEnded(room)
				}
				if (!wasInMeeting && inMeeting) this.onMeetingStarted(roomID)
				this.instance.updateVariableValues()
				this.instance.checkFeedbacks(FeedbackIdRoomStatus.InMeeting, FeedbackIdGallery.GhostSeats)
			} else if (path === 'participantCount') {
				room.participantCount = this.argInt(args, 3)
				this.instance.updateVariableValues()
				this.instance.checkFeedbacks(FeedbackIdGallery.GhostSeats)
			} else if (path === 'meetingGalleryOrder') {
				this.handleGallerySeat(room, args)
			} else if (path === 'galleryDistributionMode') {
				room.galleryMode = this.argStr(args, 3)
				this.instance.updateVariableValues()
				this.instance.checkFeedbacks(FeedbackIdGallery.GalleryMode)
			} else if (path === 'galleryGridSizeHWIO') {
				room.galleryGridRows = this.argInt(args, 3)
				room.galleryGridCols = this.argInt(args, 4)
				this.instance.updateVariableValues()
			} else if (path === 'galleryExcludeOptions') {
				room.excludeSelf = this.argBool(args, 3)
				room.excludeHostCoHost = this.argBool(args, 4)
				room.excludeNonVideo = this.argBool(args, 5)
				this.instance.updateVariableValues()
			} else if (path === 'muteStatus') {
				const v = args[3]
				room.muteStatus = v?.type === 'i' ? (v as { value: number }).value === 1 : (v as { value: boolean })?.value
				this.instance.updateVariableValues()
				this.instance.checkFeedbacks(FeedbackIdRoomStatus.MuteStatus)
			} else if (path === 'cameraStatus') {
				const v = args[3]
				room.cameraStatus = v?.type === 'i' ? (v as { value: number }).value === 1 : (v as { value: boolean })?.value
				this.instance.updateVariableValues()
				this.instance.checkFeedbacks(FeedbackIdRoomStatus.CameraStatus)
			} else if (path === 'selectedPrimaryCamera') {
				room.selectedPrimaryCamera = this.argStr(args, 3)
				this.instance.updateVariableValues()
			} else if (path === 'selectedMic') {
				room.selectedMic = this.argStr(args, 3)
				this.instance.updateVariableValues()
			} else if (path === 'selectedSpeaker') {
				room.selectedSpeaker = this.argStr(args, 3)
				this.instance.updateVariableValues()
			} else if (path === 'channelCountNDI') {
				room.ndiChannelCount = this.argInt(args, 3) ?? 0
				this.instance.updateVariableValues()
			} else if (path === 'channelCountHWIO') {
				room.hwioChannelCount = this.argInt(args, 3) ?? 0
				this.instance.updateVariableValues()
				if (this.routingPending.delete(roomID)) this.requestChannelConfigs(roomID, room.hwioChannelCount)
			} else if (path === 'channelCountDante') {
				room.danteChannelCount = this.argInt(args, 3) ?? 0
				this.instance.updateVariableValues()
			} else if (path === 'channelConfigNDI') {
				// int index, int status, str content, str selection
				const idx = this.argInt(args, 3)
				if (idx !== undefined && idx > 0) {
					room.ndiChannels ??= {}
					if (!room.ndiChannels[idx]) this.instance.refreshVariableDefinitions()
					room.ndiChannels[idx] = {
						status: this.argInt(args, 4) ?? 0,
						content: this.argStr(args, 5) ?? '',
						selection: this.argStr(args, 6) ?? '',
					}
					this.instance.updateVariableValues()
				}
			} else if (path === 'channelConfigHWIO') {
				// bool isActive, str channel_name, int mode (1=output, 2=input),
				// int content (dropdown index), str selection,
				// str resolution_fps, int audio_mix
				const isActive = this.argBool(args, 3)
				const channelName = this.argStr(args, 4)
				const requested = this.routingQueue.get(roomID)?.shift()
				if (channelName !== undefined && channelName !== '') {
					if (requested !== undefined) {
						room.hwioChannelNumbers ??= {}
						if (room.hwioChannelNumbers[channelName] === undefined) this.instance.refreshVariableDefinitions()
						room.hwioChannelNumbers[channelName] = requested
					}
					room.hwioChannels ??= {}
					if (!room.hwioChannels[channelName]) this.instance.refreshVariableDefinitions()
					room.hwioChannels[channelName] = {
						isActive: isActive ?? false,
						channelName,
						mode: this.argInt(args, 5) ?? 0,
						content: this.argInt(args, 6) ?? 0,
						selection: this.argStr(args, 7) ?? '',
						resolutionFps: this.argStr(args, 8) ?? '',
						audioMix: this.argInt(args, 9) ?? 0,
					}
					this.instance.updateVariableValues()
					this.instance.checkFeedbacks(
						FeedbackIdChannelStatus.HwioChannelActive,
						FeedbackIdChannelStatus.HwioChannelSelection,
					)
				}
			} else if (path === 'channelConfigDante') {
				// int index, int status, str content, str selection, str signal
				const idx = this.argInt(args, 3)
				if (idx !== undefined && idx > 0) {
					room.danteChannels ??= {}
					if (!room.danteChannels[idx]) this.instance.refreshVariableDefinitions()
					room.danteChannels[idx] = {
						status: this.argInt(args, 4) ?? 0,
						content: this.argStr(args, 5) ?? '',
						selection: this.argStr(args, 6) ?? '',
						signal: this.argStr(args, 7) ?? '',
					}
					this.instance.updateVariableValues()
				}
			}
		}
	}

	/** A reply from a room missing in the paired list means the list is stale: re-request it (throttled). */
	private recoverUnknownRoom(roomID: string): void {
		if (this.instance.state.pairedRooms.some((r) => r.roomID === roomID)) return
		const now = Date.now()
		if (now - this.lastRoomListRecovery < ROOM_LIST_RECOVERY_MS) return
		this.lastRoomListRecovery = now
		this.requestRoomLists()
	}

	private onMeetingStarted(roomID: string): void {
		if ((this.instance.config.pollParticipantCount ?? 0) !== 0) this.roomGet(roomID, 'getParticipantCount')
		if ((this.instance.config.pollGallerySeats ?? 0) !== 0) this.roomGet(roomID, 'getMeetingGalleryOrder')
	}

	/** The meeting ID and seat list belong to the meeting that just ended. */
	private onMeetingEnded(room: RoomState): void {
		room.meetingId = undefined
		room.gallerySeats = undefined
		room.participantCount = undefined
		this.seatBuffers.delete(room.roomID)
	}

	/** meetingGalleryOrder arrives as one message per seat: gallery_size, seat_index, name. */
	private handleGallerySeat(room: RoomState, args: OscArgument[]): void {
		const size = this.argInt(args, 3) ?? 0
		const index = this.argInt(args, 4)
		const name = this.argStr(args, 5) ?? ''
		if (size <= 0 || index === undefined) {
			room.gallerySeats = []
			this.seatBuffers.delete(room.roomID)
		} else {
			let buf = this.seatBuffers.get(room.roomID)
			if (!buf || index <= buf.lastIndex || buf.size !== size) {
				buf = { size, lastIndex: 0, seats: new Map() }
				this.seatBuffers.set(room.roomID, buf)
			}
			buf.lastIndex = index
			buf.seats.set(index, name)
			if (buf.seats.size < size) return
			room.gallerySeats = [...buf.seats.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n)
			this.seatBuffers.delete(room.roomID)
		}
		this.instance.updateVariableValues()
		this.instance.checkFeedbacks(FeedbackIdGallery.GhostSeats)
	}

	/** One getHWIOChannelConfig per channel, spaced out so each reply maps to its channel number. */
	private requestChannelConfigs(roomID: string, count: number): void {
		const queue: number[] = []
		this.routingQueue.set(roomID, queue)
		for (let ch = 1; ch <= count; ch++) {
			this.routingTimers.push(
				setTimeout(
					() => {
						queue.push(ch)
						this.roomGet(roomID, 'getHWIOChannelConfig', [ch])
					},
					(ch - 1) * ROUTING_REQUEST_GAP_MS,
				),
			)
		}
	}

	private argStr(args: OscArgument[], i: number): string | undefined {
		const a = args[i]
		if (!a) return undefined
		if (typeof a.value === 'string') return a.value
		if (typeof a.value === 'number' || typeof a.value === 'boolean') return String(a.value)
		return undefined
	}

	private argInt(args: OscArgument[], i: number): number | undefined {
		const a = args[i]
		if (!a) return undefined
		if (typeof a.value === 'number') return a.value
		if (typeof a.value === 'string') return parseInt(a.value, 10)
		return undefined
	}

	private argBool(args: OscArgument[], i: number): boolean | undefined {
		const a = args[i]
		if (!a) return undefined
		if (typeof a.value === 'boolean') return a.value
		if (typeof a.value === 'number') return a.value === 1
		if (typeof a.value === 'string') return a.value === 'true' || a.value === '1'
		return undefined
	}

	/** Record that CAVZRC is talking to us; clears a staleness warning. */
	private markHeard(): void {
		this.lastHeardAt = Date.now()
		if (this.staleWarned) {
			this.staleWarned = false
			const rxPort = this.rxPort
			this.instance.updateStatus(InstanceStatus.Ok, `Listening for CAVZRC OSC on port ${rxPort}`)
			this.instance.log('info', 'CAVZRC data resumed')
		}
	}

	/** Warn when no OSC has arrived within the timeout; probe for a reply. */
	private checkStaleness(staleMs: number): void {
		const silentFor = Date.now() - this.lastHeardAt
		if (silentFor < staleMs) return
		if (!this.staleWarned) {
			this.staleWarned = true
			const secs = Math.round(silentFor / 1000)
			this.instance.updateStatus(
				InstanceStatus.ConnectionFailure,
				`No data from CAVZRC for ${secs}s — CAVZRC unreachable or OSC output disabled?`,
			)
			this.instance.log('warn', `No OSC from CAVZRC for ${secs}s; probing`)
		}
		try {
			this.requestRoomLists() // probe: if CAVZRC is alive we will hear back
		} catch {
			/* socket may be gone */
		}
	}

	public destroy(): void {
		for (const t of this.pollTimers) clearInterval(t)
		this.pollTimers = []
		for (const t of this.routingTimers) clearTimeout(t)
		this.routingTimers = []
		if (this.roomListInterval !== null) {
			clearInterval(this.roomListInterval)
			this.roomListInterval = null
		}
		if (this.stalenessInterval !== null) {
			clearInterval(this.stalenessInterval)
			this.stalenessInterval = null
		}
		if (this.udpPort) {
			this.udpPort.close()
			this.udpPort = null
		}
	}
}
