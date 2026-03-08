"""
HW1: Grid Map & Policy Evaluation Flask Application
Deep Reinforcement Learning Course
"""

import random
import numpy as np
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Action definitions: (row_delta, col_delta)
ACTIONS = {
    'up':    (-1, 0),
    'down':  (1, 0),
    'left':  (0, -1),
    'right': (0, 1),
}
ACTION_LIST = list(ACTIONS.keys())


@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')


@app.route('/api/evaluate', methods=['POST'])
def evaluate():
    """
    Receive grid configuration, generate random policy,
    run policy evaluation, and return results.

    Expected JSON body:
    {
        "n": int,
        "start": [row, col],
        "end": [row, col],
        "obstacles": [[row, col], ...]
    }
    """
    data = request.get_json()
    n = data['n']
    start = tuple(data['start'])
    end = tuple(data['end'])
    obstacles = set(tuple(o) for o in data['obstacles'])

    # ---------- Generate Random Policy ----------
    policy = {}
    for r in range(n):
        for c in range(n):
            cell = (r, c)
            if cell == end or cell in obstacles:
                policy[cell] = None
            else:
                policy[cell] = random.choice(ACTION_LIST)

    # ---------- Policy Evaluation ----------
    gamma = 0.9        # discount factor
    theta = 1e-6       # convergence threshold
    reward = -1        # step reward

    # Initialize V(s) = 0 for all states
    V = np.zeros((n, n), dtype=float)

    for iteration in range(10000):
        delta = 0.0
        for r in range(n):
            for c in range(n):
                cell = (r, c)
                # Terminal state or obstacle: V = 0
                if cell == end or cell in obstacles:
                    continue

                action = policy[cell]
                dr, dc = ACTIONS[action]
                nr, nc = r + dr, c + dc

                # If next state is out of bounds or obstacle, stay in place
                if nr < 0 or nr >= n or nc < 0 or nc >= n or (nr, nc) in obstacles:
                    nr, nc = r, c

                v_old = V[r, c]
                V[r, c] = reward + gamma * V[nr, nc]
                delta = max(delta, abs(V[r, c] - v_old))

        if delta < theta:
            break

    # ---------- Build Response ----------
    values = []
    policies = []
    for r in range(n):
        value_row = []
        policy_row = []
        for c in range(n):
            value_row.append(round(float(V[r, c]), 2))
            policy_row.append(policy[(r, c)])
        values.append(value_row)
        policies.append(policy_row)

    return jsonify({
        'values': values,
        'policies': policies,
        'iterations': iteration + 1,
        'gamma': gamma,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
