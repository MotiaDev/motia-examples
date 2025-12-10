config = {
    "type": "event",
    "name": "MyPythonStep",
    "description": "Checks a state change using python",
    "subscribes": ["check-state-change"], 
    "emits": [],
    "flows": ["default"],
    "input": None,  # Replace with Pydantic model for validation
}

async def handler(input, ctx):
    ctx.logger.info('Processing MyPythonStep', input)
    ctx.logger.info('[MyPythonStep] key', input.get('key'))

    value = await ctx.state.get(ctx.trace_id, input.get('key'))
    
    ctx.logger.info('State change detected using Python: ', {
        'key': input.get('key'),
        'value': value,
        'trace_id': ctx.trace_id
    })
