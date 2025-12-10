import React, { useState } from 'react'
import { BaseNode, NoopNodeProps } from 'motia/workbench'
import { Button } from '@motiadev/ui'
import * as Select from '@radix-ui/react-select'
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'

export const Node: React.FC<NoopNodeProps> = ({ data }) => {
  const [selectedEvent, setSelectedEvent] = useState<string | undefined>()
  const virtualEmits = (data as any).virtualEmits || []

  const events = [
    {
      type: 'createCard',
      payload: {
        action: {
          type: 'createCard',
          data: {
            card: {
              id: 'card123',
              name: 'Test Card',
              desc: 'Test Description',
            },
            list: {
              id: 'list123',
            },
          },
        },
      },
    },
    {
      type: 'updateCustomFieldItem',
      payload: {
        action: {
          type: 'updateCustomFieldItem',
          data: {
            card: {
              id: 'card123',
            },
            customFieldItem: {
              idCustomField: 'field123',
              idValue: 'value123',
            },
          },
        },
      },
    },
    {
      type: 'commentCard',
      payload: {
        action: {
          type: 'commentCard',
          data: {
            card: {
              id: 'card123',
            },
            list: {
              id: 'list123',
            },
            text: 'Test comment',
          },
          display: {
            entities: {
              memberCreator: {
                username: 'testuser',
              },
            },
          },
        },
      },
    },
    {
      type: 'addMemberToCard',
      payload: {
        action: {
          type: 'addMemberToCard',
          data: {
            card: {
              id: 'card123',
            },
          },
        },
      },
    },
  ]

  const simulateEvent = () => {
    if (!selectedEvent) return
    
    const event = events.find((e) => e.type === selectedEvent)
    if (!event) return

    fetch('/trello/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event.payload),
    }).catch((error) => {
      console.error('Error simulating event:', error)
    })
  }

  return (
    <BaseNode
      title={data.name}
      variant="noop"
      data={data}
      subtitle={data.description}
      disableTargetHandle
      disableSourceHandle={!virtualEmits.length}
    >
      <div className="flex flex-row gap-4">
        <div className="flex flex-col items-center text-sm">{data.description}</div>
        <div className="flex flex-row items-center gap-2 text-sm">
          <Select.Root onValueChange={setSelectedEvent}>
            <Select.Trigger className="inline-flex items-center justify-between rounded px-4 py-2 text-sm leading-none gap-1 border border-gray-200 focus:outline-none">
              <Select.Value placeholder="Simulate Event" />
              <Select.Icon>
                <ChevronDownIcon />
              </Select.Icon>
            </Select.Trigger>

            <Select.Portal>
              <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200">
                <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
                  <ChevronUpIcon />
                </Select.ScrollUpButton>

                <Select.Viewport className="p-1">
                  <Select.Group>
                    {events.map((event) => (
                      <Select.Item
                        key={event.type}
                        value={event.type}
                        className="relative flex items-center px-8 py-2 text-sm text-gray-700 rounded-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none select-none"
                      >
                        <Select.ItemText>{event.type}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Viewport>

                <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-white text-gray-700 cursor-default">
                  <ChevronDownIcon />
                </Select.ScrollDownButton>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <Button
            onClick={simulateEvent}
            disabled={!selectedEvent}
            className="inline-flex items-center justify-center rounded px-4 py-2 text-sm leading-none border border-gray-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Play
          </Button>
        </div>
      </div>
    </BaseNode>
  )
}
