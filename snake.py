# snake.py
import os
import json
from aiohttp import web

class SnakeNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "play_snake"
    CATEGORY = "games"

    def play_snake(self, image):
        return (image,)


# Get the path to this extension
EXTENSION_PATH = os.path.dirname(os.path.realpath(__file__))
HIGHSCORE_FILE = os.path.join(EXTENSION_PATH, "snake_highscore.json")

routes = web.RouteTableDef()

@routes.get("/snake/highscore")
async def get_snake_highscore(request):
    try:
        if os.path.exists(HIGHSCORE_FILE):
            with open(HIGHSCORE_FILE, "r") as f:
                return web.json_response(json.load(f))

        default_score = {"score": 0}
        return web.json_response(default_score)

    except Exception as e:
        print(f"Error loading snake high score: {e}")
        return web.json_response({"score": 0}, status=500)


@routes.post("/snake/highscore")
async def save_snake_highscore(request):
    try:
        data = await request.json()
        with open(HIGHSCORE_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return web.json_response({"success": True})
    except Exception as e:
        print(f"Error saving snake high score: {e}")
        return web.json_response(
            {"success": False, "error": str(e)}, status=500
        )


# Export the routes and WEB_DIRECTORY
WEB_DIRECTORY = "./web"

__all__ = ["SnakeNode", "WEB_DIRECTORY"]