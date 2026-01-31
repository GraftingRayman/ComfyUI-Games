# pacman.py
import os
import json
import server
from aiohttp import web

class PacManNode:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "play_pacman"
    CATEGORY = "games"

    def play_pacman(self, image):
        # Currently just passes through - you'd add game logic here
        return (image,)


# Get the path to this extension
EXTENSION_PATH = os.path.dirname(os.path.realpath(__file__))
HIGHSCORE_FILE = os.path.join(EXTENSION_PATH, "pacman_highscore.json")

# Register routes with ComfyUI's server
@server.PromptServer.instance.routes.get("/pacman/highscore")
async def get_pacman_highscore(request):
    try:
        if os.path.exists(HIGHSCORE_FILE):
            with open(HIGHSCORE_FILE, "r") as f:
                return web.json_response(json.load(f))

        default_score = {"score": 0, "level": 1}
        return web.json_response(default_score)

    except Exception as e:
        print(f"Error loading pacman high score: {e}")
        return web.json_response({"score": 0, "level": 1}, status=500)


@server.PromptServer.instance.routes.post("/pacman/highscore")
async def save_pacman_highscore(request):
    try:
        data = await request.json()
        with open(HIGHSCORE_FILE, "w") as f:
            json.dump(data, f, indent=2)
        return web.json_response({"success": True})
    except Exception as e:
        print(f"Error saving pacman high score: {e}")
        return web.json_response(
            {"success": False, "error": str(e)}, status=500
        )




# Export the routes and WEB_DIRECTORY
WEB_DIRECTORY = "./web"

__all__ = ["PacManNode", "WEB_DIRECTORY"]