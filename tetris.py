import os
import json
from aiohttp import web

class TetrisNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "play_tetris"
    CATEGORY = "games"

    def play_tetris(self, image):
        return (image,)


# Get the path to this extension
EXTENSION_PATH = os.path.dirname(os.path.realpath(__file__))
HIGHSCORES_FILE = os.path.join(EXTENSION_PATH, "tetris_highscores.json")

routes = web.RouteTableDef()

@routes.get("/tetris/highscores")
async def get_highscores(request):
    try:
        if os.path.exists(HIGHSCORES_FILE):
            with open(HIGHSCORES_FILE, "r") as f:
                return web.json_response(json.load(f))

        default_scores = [
            {"name": "PLAYER1", "score": 5000, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "PLAYER2", "score": 4000, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "PLAYER3", "score": 3000, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "PLAYER4", "score": 2000, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "PLAYER5", "score": 1000, "date": "2026-01-01T00:00:00.000Z"},
        ]
        return web.json_response(default_scores)

    except Exception as e:
        print(f"Error loading high scores: {e}")
        return web.json_response([], status=500)


@routes.post("/tetris/highscores")
async def save_highscores(request):
    try:
        data = await request.json()
        with open(HIGHSCORES_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return web.json_response({"success": True})
    except Exception as e:
        print(f"Error saving high scores: {e}")
        return web.json_response(
            {"success": False, "error": str(e)}, status=500
        )


WEB_DIRECTORY = "./web"
WEB_ROUTES = routes
