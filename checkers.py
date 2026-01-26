# checkers.py
import os
import json
from aiohttp import web

class CheckersNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "play_checkers"
    CATEGORY = "games"

    def play_checkers(self, image):
        return (image,)


# Get the path to this extension
EXTENSION_PATH = os.path.dirname(os.path.realpath(__file__))
HIGHSCORES_FILE = os.path.join(EXTENSION_PATH, "checkers_highscores.json")

routes = web.RouteTableDef()

@routes.get("/checkers/highscores")
async def get_checkers_highscores(request):
    try:
        if os.path.exists(HIGHSCORES_FILE):
            with open(HIGHSCORES_FILE, "r") as f:
                return web.json_response(json.load(f))

        default_scores = [
            {"name": "GRANDMASTER", "wins": 50, "draws": 10, "losses": 5, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "MASTER", "wins": 30, "draws": 15, "losses": 20, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "PLAYER", "wins": 20, "draws": 20, "losses": 25, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "ROOKIE", "wins": 10, "draws": 5, "losses": 40, "date": "2026-01-01T00:00:00.000Z"},
            {"name": "BEGINNER", "wins": 5, "draws": 10, "losses": 50, "date": "2026-01-01T00:00:00.000Z"},
        ]
        return web.json_response(default_scores)

    except Exception as e:
        print(f"Error loading checkers high scores: {e}")
        return web.json_response([], status=500)


@routes.post("/checkers/highscores")
async def save_checkers_highscores(request):
    try:
        data = await request.json()
        with open(HIGHSCORES_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return web.json_response({"success": True})
    except Exception as e:
        print(f"Error saving checkers high scores: {e}")
        return web.json_response(
            {"success": False, "error": str(e)}, status=500
        )


WEB_DIRECTORY = "./web"