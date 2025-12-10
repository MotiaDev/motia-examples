import { TrelloCard } from '../../types/trello'

export const createMockTrelloCard = (overrides: Partial<TrelloCard> = {}): TrelloCard => ({
  id: overrides.id || 'card123',
  name: overrides.name || 'Test Card',
  desc: overrides.desc || 'Test card description',
  idList: overrides.idList || 'list123',
  due: overrides.due,
  dueComplete: overrides.dueComplete ?? false,
  members: overrides.members || [],
})

export const createOverdueMockCard = (overrides: Partial<TrelloCard> = {}): TrelloCard =>
  createMockTrelloCard({
    id: 'card2',
    name: 'Overdue Task',
    due: new Date(Date.now() - 86400000).toISOString(), // due yesterday
    ...overrides,
  })

export const createFutureDueMockCard = (overrides: Partial<TrelloCard> = {}): TrelloCard =>
  createMockTrelloCard({
    id: 'card1',
    name: 'Future Task',
    due: new Date(Date.now() + 86400000).toISOString(), // due tomorrow
    ...overrides,
  })

export const mockCards: TrelloCard[] = [createFutureDueMockCard(), createOverdueMockCard()]
