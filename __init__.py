# __init__.py
from .tetris import TetrisNode
from .tictactoe import TicTacToeNode
from .checkers import CheckersNode
from .snake import SnakeNode
from .arkanoid import ArkanoidNode
from .pacman import PacManNode

NODE_CLASS_MAPPINGS = {
    "TetrisNode": TetrisNode,
    "TicTacToeNode": TicTacToeNode,
    "CheckersNode": CheckersNode,
    "SnakeNode": SnakeNode,
    "ArkanoidNode": ArkanoidNode,
    "PacManNode": PacManNode,

}

NODE_DISPLAY_NAME_MAPPINGS = {
    "TetrisNode": "Tetris Game",
    "TicTacToeNode": "Tic Tac Toe Game",
    "CheckersNode": "Checkers Game",
    "SnakeNode": "Snake Game",
    "ArkanoidNode": "Arkanoid Game",
    "PacManNode": "Pac-Man Game",

}

# The web directory is already defined in each game file
WEB_DIRECTORY = "./web"

# Print load message for each node
for node_name in NODE_CLASS_MAPPINGS.keys():
    print(f"\033[91mComfyUI-Games Node Loaded: {node_name}\033[0m")

__all__ = [
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
    "WEB_DIRECTORY",
]