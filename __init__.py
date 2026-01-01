from .tetris import TetrisNode, WEB_DIRECTORY, WEB_ROUTES

NODE_CLASS_MAPPINGS = {
    "TetrisNode": TetrisNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TetrisNode": "Tetris Game"
}

# Print load message for each node
for node_name in NODE_CLASS_MAPPINGS.keys():
    print(f"\033[91mNode Loaded: {node_name}\033[0m")

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
    "WEB_ROUTES",
]
