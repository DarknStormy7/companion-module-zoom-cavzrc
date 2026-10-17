import { UDPPort } from 'osc'
import { OSC } from '../src/osc.js'
import { GetActions } from '../src/actions.js'
import { GetFeedbacks } from '../src/feedback.js'
import { UpgradeScripts } from '../src/upgrades.js'
import { normalizeMeetingId, parseChannelList, tileAspectRatio } from '../src/actions/action-gallery.js'
import { ghostSeatCount, isInMeetingStatus } from '../src/utils.js'
import { updateVariableValues } from '../src/variables/variable-values.js'
import { createMockInstance } from './helpers/mock-instance.js'
import { invoke } from './helpers/invoke.js'
import type { ZoomRoomsInstance } from '../src/utils.js'

type MockPort = { send: jest.Mock; on: jest.Mock; open: jest.Mock; close: jest.Mock }

const ROOM = 'room-a'

function arg(type: string, value: unknown) {
	return { type, value }
}

function lastPort(): MockPort {
	const results = (UDPPort as jest.Mock).mock.results
	return results[results.length - 1]?.value as MockPort
}

function handler(port: MockPort, event: string): (...a: unknown[]) => void {
	const call = port.on.mock.calls.find((c: unknown[]) => c[0] === event)
	return call?.[1] as (...a: unknown[]) => void
}

function setup(config: Record<string, unknown> = {}) {
	const { instance } = createMockInstance()
	const inst = instance as unknown as Record<string, unknown>
	inst.config = { host: '127.0.0.1', tx_port: 9090, rx_port: 1234, oscOutputHeader: '/roomosc', ...config }
	inst.setVariableValues = jest.fn()
	const osc = new OSC(instance)
	const port = lastPort()
	handler(port, 'ready')()
	const send = (address: string, args: ReturnType<typeof arg>[]) => handler(port, 'message')({ address, args })
	const roomMsg = (path: string, ...args: ReturnType<typeof arg>[]) =>
		send(`/roomosc/${path}`, [arg('s', ROOM), arg('s', 'Studio 2'), arg('i', 1), ...args])
	const pairRoom = () =>
		send('/roomosc/pairedRoomList', [arg('i', 1), arg('i', 1), arg('s', ROOM), arg('s', 'Studio 2')])
	const sent = () =>
		port.send.mock.calls.map((c: unknown[]) => {
			const m = c[0] as { address: string; args: { value: unknown }[] }
			return [m.address.replace('/zoomRooms/', ''), ...m.args.map((a) => a.value)].join(' ')
		})
	return { osc, port, instance, send, roomMsg, pairRoom, sent }
}

describe('per-query polling', () => {
	beforeEach(() => {
		jest.useFakeTimers()
		;(UDPPort as jest.Mock).mockClear()
	})
	afterEach(() => jest.useRealTimers())

	it('polls meeting status on its own interval and never re-requests the room list', () => {
		const t = setup({ pollMeetingStatus: 5000 })
		t.pairRoom()
		t.port.send.mockClear()
		jest.advanceTimersByTime(10000)
		expect(t.sent()).toEqual([`roomID/getMeetingStatus ${ROOM}`, `roomID/getMeetingStatus ${ROOM}`])
	})

	it('asks participant count and gallery seats only while in a meeting', () => {
		const t = setup({ pollParticipantCount: 2500, pollGallerySeats: 10000 })
		t.pairRoom()
		t.roomMsg('meetingStatus', arg('s', 'Idle'))
		t.port.send.mockClear()
		jest.advanceTimersByTime(10000)
		expect(t.sent()).toEqual([])

		t.roomMsg('meetingStatus', arg('s', 'In Meeting'))
		// Entering a meeting asks both right away.
		expect(t.sent()).toEqual([`roomID/getParticipantCount ${ROOM}`, `roomID/getMeetingGalleryOrder ${ROOM}`])
		t.port.send.mockClear()
		jest.advanceTimersByTime(10000)
		expect(t.sent().filter((c) => c.includes('getParticipantCount'))).toHaveLength(4)
		expect(t.sent().filter((c) => c.includes('getMeetingGalleryOrder'))).toHaveLength(1)
	})

	it('runs the "on connect" queries when a room is first seen', () => {
		const t = setup({ pollMeetingStatus: 5000, pollGallerySettings: -1, pollChannelRouting: -1 })
		t.port.send.mockClear()
		t.pairRoom()
		expect(t.sent()).toEqual([
			`roomID/getMeetingStatus ${ROOM}`,
			`roomID/getGalleryDistributionMode ${ROOM}`,
			`roomID/getHWIOGalleryGridSize ${ROOM}`,
			`roomID/getGalleryExcludeOptions ${ROOM}`,
			`roomID/getHWIOChannelCount ${ROOM}`,
		])
		// "On connect" adds no timer.
		t.port.send.mockClear()
		t.pairRoom()
		jest.advanceTimersByTime(120000)
		expect(t.sent().filter((c) => c.startsWith('roomID/') && !c.includes('getMeetingStatus'))).toEqual([])
	})

	it('maps each HWIO channel name to its channel number', () => {
		const t = setup({ pollChannelRouting: -1 })
		t.pairRoom()
		t.port.send.mockClear()
		t.roomMsg('channelCountHWIO', arg('i', 2))
		jest.advanceTimersByTime(1000)
		expect(t.sent()).toEqual([`roomID/getHWIOChannelConfig ${ROOM} 1`, `roomID/getHWIOChannelConfig ${ROOM} 2`])
		t.roomMsg('channelConfigHWIO', arg('T', true), arg('s', 'DeckLink 1 SDI'), arg('i', 1))
		t.roomMsg('channelConfigHWIO', arg('T', true), arg('s', 'DeckLink 2 SDI'), arg('i', 1))
		expect(t.instance.state.rooms[ROOM].hwioChannelNumbers).toEqual({ 'DeckLink 1 SDI': 1, 'DeckLink 2 SDI': 2 })
		// A count that nobody asked for (pushed by CAVZRC) does not start a refresh.
		t.port.send.mockClear()
		t.roomMsg('channelCountHWIO', arg('i', 2))
		jest.advanceTimersByTime(1000)
		expect(t.sent()).toEqual([])
	})

	it('re-requests the room lists when a reply comes from an unknown room, at most every 10 s', () => {
		const t = setup()
		t.port.send.mockClear()
		t.roomMsg('participantCount', arg('i', 3))
		t.roomMsg('participantCount', arg('i', 3))
		expect(t.sent()).toEqual(['getAddedRoomList', 'getPairedRoomList'])
	})
})

describe('room lists', () => {
	beforeEach(() => (UDPPort as jest.Mock).mockClear())

	it('accepts the documented pairedRoomsList name and drops rooms missing from a resent list', () => {
		const t = setup()
		t.send('/roomosc/pairedRoomsList', [arg('i', 2), arg('i', 1), arg('s', 'a'), arg('s', 'A')])
		t.send('/roomosc/pairedRoomsList', [arg('i', 2), arg('i', 2), arg('s', 'b'), arg('s', 'B')])
		expect(t.instance.state.pairedRooms.map((r) => r.roomID)).toEqual(['a', 'b'])
		t.send('/roomosc/pairedRoomsList', [arg('i', 1), arg('i', 1), arg('s', 'b'), arg('s', 'B')])
		expect(t.instance.state.pairedRooms).toEqual([{ roomID: 'b', roomName: 'B', roomIndex: 1 }])
	})
})

describe('gallery state', () => {
	beforeEach(() => (UDPPort as jest.Mock).mockClear())

	it('collects meetingGalleryOrder seats and counts "not joined" seats', () => {
		const t = setup()
		t.pairRoom()
		t.roomMsg('participantCount', arg('i', 2))
		const names = ['Studio 2', 'Ana', 'Sara', 'Bruno']
		names.forEach((n, i) => t.roomMsg('meetingGalleryOrder', arg('i', 4), arg('i', i + 1), arg('s', n)))
		const room = t.instance.state.rooms[ROOM]
		expect(room.gallerySeats).toEqual(names)
		expect(ghostSeatCount(room)).toBe(1)
		// A second round replaces the first.
		;['Studio 2', 'Ana', 'Bruno'].forEach((n, i) =>
			t.roomMsg('meetingGalleryOrder', arg('i', 3), arg('i', i + 1), arg('s', n)),
		)
		expect(room.gallerySeats).toEqual(['Studio 2', 'Ana', 'Bruno'])
		expect(ghostSeatCount(room)).toBe(0)
	})

	it('parses mode, grid size and exclude options', () => {
		const t = setup()
		t.roomMsg('galleryDistributionMode', arg('s', 'assigned'))
		t.roomMsg('galleryGridSizeHWIO', arg('i', 2), arg('i', 3))
		t.roomMsg('galleryExcludeOptions', arg('F', false), arg('T', true), arg('F', false))
		expect(t.instance.state.rooms[ROOM]).toMatchObject({
			galleryMode: 'assigned',
			galleryGridRows: 2,
			galleryGridCols: 3,
			excludeSelf: false,
			excludeHostCoHost: true,
			excludeNonVideo: false,
		})
	})

	it('forgets the meeting ID and seats when the meeting ends', () => {
		const t = setup()
		t.roomMsg('meetingStatus', arg('s', 'In Meeting'))
		const room = t.instance.state.rooms[ROOM]
		room.meetingId = '8916561023'
		room.gallerySeats = ['Studio 2']
		t.roomMsg('meetingStatus', arg('s', 'connecting'))
		expect(room.meetingId).toBe('8916561023')
		t.roomMsg('meetingStatus', arg('s', 'In Meeting'))
		t.roomMsg('meetingStatus', arg('s', 'Not In Meeting'))
		expect(room.meetingId).toBeUndefined()
		expect(room.gallerySeats).toBeUndefined()
	})

	it('keeps an ID stored by "Join meeting" while the room still reports idle', () => {
		const t = setup()
		t.roomMsg('meetingStatus', arg('s', 'Idle'))
		t.instance.state.rooms[ROOM].meetingId = '8916561023'
		t.roomMsg('meetingStatus', arg('s', 'Idle'))
		expect(t.instance.state.rooms[ROOM].meetingId).toBe('8916561023')
	})
})

describe('gallery actions', () => {
	let instance: ZoomRoomsInstance
	let send: jest.Mock
	let actions: ReturnType<typeof GetActions>

	beforeEach(() => {
		const mock = createMockInstance()
		instance = mock.instance
		send = mock.mockSendCommand
		instance.state.pairedRooms.push({ roomID: ROOM, roomName: 'Studio 2', roomIndex: 1 })
		actions = GetActions(instance)
	})

	it('clears seats with a typed meeting ID, spaces removed', () => {
		invoke(actions.galleryClearSeats, { targetType: 'roomIndex', roomIndex: '1', meetingId: '891 656 1023' })
		expect(send).toHaveBeenCalledWith('/zoomRooms/roomIndex/removeGalleryAssignment', [1, '8916561023'])
	})

	it('uses the meeting ID stored by "Join meeting" when the field is blank', () => {
		invoke(actions.joinMeeting, { targetType: 'roomIndex', roomIndex: '1', meetingID: '891-656-1023' })
		send.mockClear()
		invoke(actions.galleryDeleteSeat, { targetType: 'roomIndex', roomIndex: '1', meetingId: '', seat: 14 })
		expect(send).toHaveBeenCalledWith('/zoomRooms/roomID/removeGalleryAssignmentSeat', [ROOM, '8916561023', 14])
	})

	it('uses the meeting ID stored by "Gallery: Set meeting ID", and warns when there is none', () => {
		invoke(actions.galleryClearSeats, { targetType: 'roomIndex', roomIndex: '1', meetingId: '' })
		expect(send).not.toHaveBeenCalled()
		expect(instance.log).toHaveBeenCalledWith('warn', expect.stringContaining('no meeting ID'))
		invoke(actions.gallerySetMeetingId, { targetType: 'roomName', roomName: 'Studio 2', value: '123 456 789' })
		invoke(actions.galleryClearSeats, { targetType: 'roomIndex', roomIndex: '1', meetingId: '' })
		expect(send).toHaveBeenCalledWith('/zoomRooms/roomID/removeGalleryAssignment', [ROOM, '123456789'])
	})

	describe('grid and aspect ratio', () => {
		beforeEach(() => jest.useFakeTimers())
		afterEach(() => jest.useRealTimers())

		it('sets the grid, then each channel aspect one at a time after the grid has settled', () => {
			invoke(actions.setHWIOGalleryGridSize, {
				targetType: 'roomIndex',
				roomIndex: '1',
				rows: 2,
				cols: 2,
				setAspect: true,
				channels: '1, 3',
				width: 1920,
				height: 1080,
			})
			expect(send.mock.calls).toEqual([
				['/zoomRooms/roomIndex/setHWIOGalleryGridSize', [1, 2, 2]],
				['/zoomRooms/roomIndex/getHWIOGalleryGridSize', [1]],
			])
			jest.advanceTimersByTime(500)
			expect(send.mock.calls.slice(2)).toEqual([
				['/zoomRooms/roomIndex/setHWIOAspectRatio', [1, 1, { type: 'f', value: 1.778 }]],
				['/zoomRooms/roomIndex/getHWIOLayoutSettings', [1, 1]],
			])
			jest.advanceTimersByTime(250)
			expect(send.mock.calls.slice(4)).toEqual([
				['/zoomRooms/roomIndex/setHWIOAspectRatio', [1, 3, { type: 'f', value: 1.778 }]],
				['/zoomRooms/roomIndex/getHWIOLayoutSettings', [1, 3]],
			])
		})

		it('uses the delays set in the action', () => {
			invoke(actions.setHWIOGalleryGridSize, {
				targetType: 'roomIndex',
				roomIndex: '1',
				rows: 1,
				cols: 2,
				setAspect: true,
				channels: '1,3',
				settleMs: 1000,
				gapMs: 2000,
			})
			const aspectSends = () => send.mock.calls.filter((c) => String(c[0]).endsWith('setHWIOAspectRatio')).length
			jest.advanceTimersByTime(999)
			expect(aspectSends()).toBe(0)
			jest.advanceTimersByTime(1)
			expect(aspectSends()).toBe(1)
			jest.advanceTimersByTime(1999)
			expect(aspectSends()).toBe(1)
			jest.advanceTimersByTime(1)
			expect(aspectSends()).toBe(2)
		})

		it('leaves the aspect alone by default', () => {
			invoke(actions.setHWIOGalleryGridSize, { targetType: 'roomIndex', roomIndex: '1', rows: 1, cols: 2 })
			jest.advanceTimersByTime(5000)
			expect(send.mock.calls.map((c) => c[0])).toEqual([
				'/zoomRooms/roomIndex/setHWIOGalleryGridSize',
				'/zoomRooms/roomIndex/getHWIOGalleryGridSize',
			])
		})

		it('applies a preset ratio to several channels', () => {
			invoke(actions.setHWIOAspectRatio, { targetType: 'roomIndex', roomIndex: '1', channels: '4,5', preset: '0.889' })
			jest.advanceTimersByTime(1000)
			expect(send.mock.calls.filter((c) => String(c[0]).endsWith('setHWIOAspectRatio'))).toEqual([
				['/zoomRooms/roomIndex/setHWIOAspectRatio', [1, 4, { type: 'f', value: 0.889 }]],
				['/zoomRooms/roomIndex/setHWIOAspectRatio', [1, 5, { type: 'f', value: 0.889 }]],
			])
		})

		it('matches the grid CAVZRC last reported, and warns when it is unknown', () => {
			invoke(actions.setHWIOAspectRatio, { targetType: 'roomIndex', roomIndex: '1', channels: '1', preset: 'grid' })
			expect(instance.log).toHaveBeenCalledWith('warn', expect.stringContaining('grid size unknown'))
			expect(send).toHaveBeenCalledWith('/zoomRooms/roomIndex/getHWIOGalleryGridSize', [1])
			send.mockClear()
			instance.state.rooms[ROOM] = { roomID: ROOM, roomName: '', roomIndex: 1, galleryGridRows: 2, galleryGridCols: 3 }
			invoke(actions.setHWIOAspectRatio, {
				targetType: 'roomIndex',
				roomIndex: '1',
				channels: '1',
				preset: 'grid',
				width: 1920,
				height: 1080,
			})
			jest.advanceTimersByTime(0)
			expect(send).toHaveBeenCalledWith('/zoomRooms/roomIndex/setHWIOAspectRatio', [1, 1, { type: 'f', value: 1.185 }])
		})

		it('sends a custom ratio', () => {
			invoke(actions.setHWIOAspectRatio, {
				targetType: 'roomIndex',
				roomIndex: '1',
				channels: '2',
				preset: 'custom',
				aspect: 2,
			})
			jest.advanceTimersByTime(0)
			expect(send).toHaveBeenCalledWith('/zoomRooms/roomIndex/setHWIOAspectRatio', [1, 2, { type: 'f', value: 2 }])
		})
	})

	it('turns an exclude option on and reads the options back', () => {
		invoke(actions.galleryExcludeOption, {
			targetType: 'roomIndex',
			roomIndex: '1',
			which: 'HostCoHost',
			state: 'enable',
		})
		expect(send.mock.calls).toEqual([
			['/zoomRooms/roomIndex/enableGalleryExcludeHostCoHost', [1]],
			['/zoomRooms/roomIndex/getGalleryExcludeOptions', [1]],
		])
	})

	it('sets the distribution mode', () => {
		invoke(actions.setGalleryDistributionMode, { targetType: 'roomIndex', roomIndex: '1', mode: 'roundrobin' })
		expect(send).toHaveBeenCalledWith('/zoomRooms/roomIndex/setGalleryDistributionMode', [1, 'roundrobin'])
	})
})

describe('feedbacks and variables', () => {
	it('"In meeting" is false while connecting', () => {
		const { instance } = createMockInstance()
		const fb = GetFeedbacks(instance).in_meeting as unknown as { callback: (f: unknown) => boolean }
		instance.state.rooms[ROOM] = { roomID: ROOM, roomName: '', roomIndex: 1, meetingStatus: 'connecting' }
		expect(fb.callback({ options: { roomId: ROOM } })).toBe(false)
		instance.state.rooms[ROOM].meetingStatus = 'In Meeting'
		expect(fb.callback({ options: { roomId: ROOM } })).toBe(true)
	})

	it('writes gallery variables for the room slot', () => {
		const { instance } = createMockInstance()
		const setVariableValues = jest.fn()
		;(instance as unknown as Record<string, unknown>).setVariableValues = setVariableValues
		instance.state.pairedRooms.push({ roomID: ROOM, roomName: 'Studio 2', roomIndex: 1 })
		instance.state.rooms[ROOM] = {
			roomID: ROOM,
			roomName: 'Studio 2',
			roomIndex: 1,
			participantCount: 1,
			gallerySeats: ['Studio 2', 'Ana', 'Sara'],
			galleryGridRows: 1,
			galleryGridCols: 2,
			meetingId: '8916561023',
			excludeHostCoHost: true,
		}
		updateVariableValues(instance)
		expect(setVariableValues).toHaveBeenCalledWith(
			expect.objectContaining({
				room_1_gallery_seats: 3,
				room_1_gallery_ghosts: 1,
				room_1_grid_size: '1x2',
				room_1_meeting_id: '8916561023',
				room_1_exclude_hosts: 'Yes',
				room_2_gallery_ghosts: '—',
			}),
		)
	})
})

describe('helpers and upgrade', () => {
	it('computes the tile aspect ratio that fills the output', () => {
		expect(tileAspectRatio(1, 1)).toBe(1.778)
		expect(tileAspectRatio(1, 2)).toBe(0.889)
		expect(tileAspectRatio(2, 3)).toBe(1.185)
	})

	it('parses helpers', () => {
		expect(normalizeMeetingId(' 891 656-1023 ')).toBe('8916561023')
		expect(parseChannelList('1, 3,4 x 5')).toEqual([1, 3, 4, 5])
		expect(isInMeetingStatus('in_meeting')).toBe(true)
		expect(isInMeetingStatus('Not In Meeting')).toBe(false)
	})

	it('carries the old single poll interval over to meeting status and participant count', () => {
		const run = (config: Record<string, unknown>) =>
			UpgradeScripts[0]({} as never, { config, actions: [], feedbacks: [] } as never)
				.updatedConfig as unknown as Record<string, unknown>
		expect(run({ pollInterval: 1000 })).toMatchObject({ pollMeetingStatus: 2500, pollParticipantCount: 1000 })
		expect(run({ pollInterval: 0 })).toMatchObject({ pollMeetingStatus: 0, pollParticipantCount: 0 })
		expect(run({ pollInterval: 1000 })).not.toHaveProperty('pollInterval')
		expect(run({ pollMeetingStatus: 5000 })).toBeNull()
	})
})
