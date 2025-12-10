export type TrelloActionType = 'createCard' | 'updateCard' | 'commentCard' | 'addMemberToCard' | 'updateCustomFieldItem'

export interface TrelloMember {
  id: string
  fullName: string
  username: string
}

export interface TrelloCard {
  id: string
  name: string
  desc: string
  due?: string
  dueComplete?: boolean
  idList: string
  members: Array<{
    id: string
    fullName?: string
  }>
}

export interface TrelloCustomFieldItem {
  idCustomField: string
  idValue: string | null
}

export interface TrelloWebhookPayload {
  action: {
    type: TrelloActionType
    data: {
      card?: {
        id: string
        name: string
        desc?: string
      }
      list?: {
        id: string
        name: string
      }
      text?: string
      customFieldItem?: TrelloCustomFieldItem
    }
    display: {
      entities: {
        memberCreator: {
          username: string
        }
      }
    }
  }
}

export interface TrelloConfig {
  apiKey: string
  token: string
}

export interface TrelloCardBadges {
  attachmentsByType: {
    trello: {
      board: number
      card: number
    }
  }
  location: boolean
  votes: number
  viewingMemberVoted: boolean
  subscribed: boolean
  fogbugz?: string
  checkItems: number
  checkItemsChecked: number
  comments: number
  attachments: number
  description: boolean
  due?: string
  start?: string
  dueComplete: boolean
}

export interface TrelloCardCover {
  color?: string
  idUploadedBackground?: boolean
  size?: 'normal' | 'full'
  brightness?: 'light' | 'dark'
  isTemplate: boolean
}

export interface TrelloCardLabel {
  id: string
  idBoard: string
  name: string
  color: string
}

export interface TrelloCardLimits {
  attachments: {
    perBoard: {
      status: 'ok' | 'warning' | 'error'
      disableAt: number
      warnAt: number
    }
  }
}

export interface TrelloCardDetails extends TrelloCard {
  address?: string
  badges: TrelloCardBadges
  checkItemStates?: string[]
  closed: boolean
  coordinates?: string
  creationMethod?: string
  dateLastActivity: string
  descData?: {
    emoji: Record<string, any>
  }
  dueReminder?: string
  idBoard: string
  idChecklists: Array<{ id: string }>
  idLabels: TrelloCardLabel[]
  idMembersVoted: string[]
  idShort: number
  labels: string[]
  limits: TrelloCardLimits
  locationName?: string
  manualCoverAttachment: boolean
  pos: number
  shortLink: string
  shortUrl: string
  subscribed: boolean
  url: string
  cover: TrelloCardCover
  customFieldItems?: TrelloCustomFieldItem[]
}
