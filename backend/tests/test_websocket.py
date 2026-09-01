import pytest
from channels.testing import WebsocketCommunicator
from queuing_solutions.asgi import application

@pytest.mark.asyncio
async def test_websocket_echo():
    communicator = WebsocketCommunicator(application, "/ws/echo/")
    connected, subprotocol = await communicator.connect()
    assert connected
    
    # Send JSON message
    await communicator.send_json_to({"message": "Hello World"})
    
    # Receive JSON echo response
    response = await communicator.receive_json_from()
    assert response == {"echo": "Hello World"}
    
    # Disconnect clean-up
    await communicator.disconnect()
