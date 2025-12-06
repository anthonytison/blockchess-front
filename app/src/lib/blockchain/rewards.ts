export interface RewardNFT {
    badge_type: string
    name: string
    description: string
    sourceUrl: string
}

export interface RewardConfig {
    conditions: {
        check: string
        value: number
    },
    nft: RewardNFT
}

export const rewardsList: RewardConfig[] = [
    {
        "conditions": {
            "check": "first_game",
            "value": 1
        },
        "nft": {
            "badge_type": "first_game",
            "name": "First game",
            "description": "Congratulations on playing your first chess game",
            "sourceUrl": "https://raw.githubusercontent.com/anthonytison/blockchess-design/refs/heads/main/badges/reward_first_game.png"
        }
    },
    {
        "conditions": {
            "check": "first_game_created",
            "value": 1
        },
        "nft": {
            "badge_type": "first_game_created",
            "name": "First game created",
            "description": "Congratulations on creating your first chess game",
            "sourceUrl": "https://raw.githubusercontent.com/anthonytison/blockchess-design/refs/heads/main/badges/reward_first_game_created.png"
        }
    },
    {
        "conditions": {
            "check": "wins",
            "value": 1
        },
        "nft": {
            "badge_type": "first_game_won",
            "name": "First game won",
            "description": "Congratulations on winning your first chess game",
            "sourceUrl": "https://raw.githubusercontent.com/anthonytison/blockchess-design/refs/heads/main/badges/reward_first_game_won.png"
        }
    },
    {
        "conditions": {
            "check": "wins",
            "value": 10
        },
        "nft": {
            "badge_type": "10_games_won",
            "name": "Already 10 games won",
            "description": "Congratulations on your 10th victory",
            "sourceUrl": "https://raw.githubusercontent.com/anthonytison/blockchess-design/refs/heads/main/badges/reward_10_games_won.png"
        }
    },
    {
        "conditions": {
            "check": "wins",
            "value": 50
        },
        "nft": {
            "badge_type": "50_games_won",
            "name": "Already 50 games won",
            "description": "Congratulations on your 50th victory",
            "sourceUrl": "https://raw.githubusercontent.com/anthonytison/blockchess-design/refs/heads/main/badges/reward_50_games_won.png"
        }
    },
    {
        "conditions": {
            "check": "wins",
            "value": 100
        },
        "nft": {
            "badge_type": "100_games_won",
            "name": "Already 100 games won",
            "description": "Congratulations on your 100th victory",
            "sourceUrl": "https://raw.githubusercontent.com/anthonytison/blockchess-design/refs/heads/main/badges/reward_100_games_won.png"
        }
    }
]