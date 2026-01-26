from .tetris import TetrisNode, WEB_DIRECTORY as TETRIS_WEB_DIR
from .tictactoe import TicTacToeNode, WEB_DIRECTORY as TICTACTOE_WEB_DIR

NODE_CLASS_MAPPINGS = {
    "TetrisNode": TetrisNode,
    "TicTacToeNode": TicTacToeNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TetrisNode": "Tetris Game",
    "TicTacToeNode": "TicTacToeNode"
}

# Combine web directories and routes
WEB_DIRECTORY = "./web"


# Print load message for each node
for node_name in NODE_CLASS_MAPPINGS.keys():
    print(f"\033[91mComfyUI-Games Node Loaded: {node_name}\033[0m")

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]
