# tictactoe.py
import os
import json
from aiohttp import web

class TicTacToeNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "play_tictactoe"
    CATEGORY = "games"

    def play_tictactoe(self, image):
        return (image,)


# Get the path to this extension
EXTENSION_PATH = os.path.dirname(os.path.realpath(__file__))
HIGHSCORES_FILE = os.path.join(EXTENSION_PATH, "tictactoe_highscores.json")

routes = web.RouteTableDef()

@routes.get("/tictactoe/highscores")
async def get_tictactoe_highscores(request):
    try:
        if os.path.exists(HIGHSCORES_FILE):
            with open(HIGHSCORES_FILE, "r") as f:
                return web.json_response(json.load(f))

        default_scores = [
            {"name": "CHAMPION", "wins": 50, "draws": 10, "losses": 5, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "MASTER", "wins": 30, "draws": 15, "losses": 20, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "PLAYER", "wins": 20, "draws": 20, "losses": 25, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "ROOKIE", "wins": 10, "draws": 5, "losses": 40, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "BEGINNER", "wins": 5, "draws": 10, "losses": 50, "date": "2026-01-01T00:00:00.000Z"},
        ]
        return web.json_response(default_scores)

    except Exception as e:
        print(f"Error loading tic-tac-toe high scores: {e}")
        return web.json_response([], status=500)


@routes.post("/tictactoe/highscores")
async def save_tictactoe_highscores(request):
    try:
        data = await request.json()
        with open(HIGHSCORES_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return web.json_response({"success": True})
    except Exception as e:
        print(f"Error saving tic-tac-toe high scores: {e}")
        return web.json_response(
            {"success": False, "error": str(e)}, status=500
        )


