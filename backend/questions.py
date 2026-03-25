"""
Interview coding questions with test cases.
These questions are designed for technical interviews with varying difficulty.
"""

from typing import List, Dict, Any
import random

class InterviewQuestion:
    def __init__(
        self,
        id: str,
        title: str,
        difficulty: str,
        category: str,
        description: str,
        examples: List[Dict[str, str]],
        starter_code: Dict[str, str],
        test_cases: List[Dict[str, Any]],
        constraints: List[str],
        hints: List[str]
    ):
        self.id = id
        self.title = title
        self.difficulty = difficulty
        self.category = category
        self.description = description
        self.examples = examples
        self.starter_code = starter_code
        self.test_cases = test_cases
        self.constraints = constraints
        self.hints = hints

INTERVIEW_QUESTIONS = [
    InterviewQuestion(
        id="two_sum",
        title="Two Sum",
        difficulty="easy",
        category="arrays",
        description="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
        examples=[
            {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."},
            {"input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."}
        ],
        starter_code={
            "python": "def two_sum(nums: list[int], target: int) -> list[int]:\n    # Your solution here\n    pass",
            "javascript": "function twoSum(nums, target) {\n    // Your solution here\n}"
        },
        test_cases=[
            {"input": {"nums": [2, 7, 11, 15], "target": 9}, "expected": [0, 1], "description": "Basic case"},
            {"input": {"nums": [3, 2, 4], "target": 6}, "expected": [1, 2], "description": "Non-adjacent elements"},
            {"input": {"nums": [3, 3], "target": 6}, "expected": [0, 1], "description": "Duplicate values"},
            {"input": {"nums": [1, 5, 3, 7, 2], "target": 10}, "expected": [1, 3], "description": "Larger array"}
        ],
        constraints=["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9"],
        hints=["Try using a hash map to store seen numbers", "For each number, check if target - number exists in the map"]
    ),

    InterviewQuestion(
        id="max_subarray",
        title="Maximum Subarray",
        difficulty="medium",
        category="arrays",
        description="Given an integer array nums, find the subarray with the largest sum, and return its sum.",
        examples=[
            {"input": "nums = [-2,1,-3,4,-1,2,1,-5,4]", "output": "6", "explanation": "The subarray [4,-1,2,1] has the largest sum 6."},
            {"input": "nums = [1]", "output": "1", "explanation": "The subarray [1] has the largest sum 1."}
        ],
        starter_code={
            "python": "def max_subarray(nums: list[int]) -> int:\n    # Your solution here\n    pass",
            "javascript": "function maxSubarray(nums) {\n    // Your solution here\n}"
        },
        test_cases=[
            {"input": {"nums": [-2, 1, -3, 4, -1, 2, 1, -5, 4]}, "expected": 6, "description": "Mixed positive and negative"},
            {"input": {"nums": [1]}, "expected": 1, "description": "Single element"},
            {"input": {"nums": [5, 4, -1, 7, 8]}, "expected": 23, "description": "All positive except one"},
            {"input": {"nums": [-1]}, "expected": -1, "description": "Single negative"},
            {"input": {"nums": [-2, -1]}, "expected": -1, "description": "All negative"}
        ],
        constraints=["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
        hints=["Think about Kadane's algorithm", "At each position, decide: extend previous subarray or start new?"]
    ),

    InterviewQuestion(
        id="valid_palindrome",
        title="Valid Palindrome",
        difficulty="easy",
        category="strings",
        description="A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string s, return true if it is a palindrome, or false otherwise.",
        examples=[
            {"input": "s = A man, a plan, a canal: Panama", "output": "true", "explanation": "amanaplanacanalpanama is a palindrome."},
            {"input": "s = race a car", "output": "false", "explanation": "raceacar is not a palindrome."}
        ],
        starter_code={
            "python": "def is_palindrome(s: str) -> bool:\n    # Your solution here\n    pass",
            "javascript": "function isPalindrome(s) {\n    // Your solution here\n}"
        },
        test_cases=[
            {"input": {"s": "A man, a plan, a canal: Panama"}, "expected": True, "description": "Classic palindrome"},
            {"input": {"s": "race a car"}, "expected": False, "description": "Not a palindrome"},
            {"input": {"s": " "}, "expected": True, "description": "Empty string"},
            {"input": {"s": "ab"}, "expected": False, "description": "Two different chars"}
        ],
        constraints=["1 <= s.length <= 2 * 10^5", "s consists only of printable ASCII characters"],
        hints=["Use two pointers from start and end", "Skip non-alphanumeric characters"]
    ),

    InterviewQuestion(
        id="longest_substring",
        title="Longest Substring Without Repeating Characters",
        difficulty="medium",
        category="strings",
        description="Given a string s, find the length of the longest substring without repeating characters.",
        examples=[
            {"input": "s = abcabcbb", "output": "3", "explanation": "The answer is abc, with the length of 3."},
            {"input": "s = bbbbb", "output": "1", "explanation": "The answer is b, with the length of 1."}
        ],
        starter_code={
            "python": "def length_of_longest_substring(s: str) -> int:\n    # Your solution here\n    pass",
            "javascript": "function lengthOfLongestSubstring(s) {\n    // Your solution here\n}"
        },
        test_cases=[
            {"input": {"s": "abcabcbb"}, "expected": 3, "description": "Repeating pattern"},
            {"input": {"s": "bbbbb"}, "expected": 1, "description": "All same char"},
            {"input": {"s": "pwwkew"}, "expected": 3, "description": "wke is longest"},
            {"input": {"s": ""}, "expected": 0, "description": "Empty string"},
            {"input": {"s": "abcdefghij"}, "expected": 10, "description": "No repeats"}
        ],
        constraints=["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"],
        hints=["Use sliding window technique", "Keep track of character positions in a hash map"]
    ),

    InterviewQuestion(
        id="reverse_linked_list",
        title="Reverse Linked List",
        difficulty="easy",
        category="linked_lists",
        description="Given the head of a singly linked list, reverse the list, and return the reversed list.",
        examples=[
            {"input": "head = [1,2,3,4,5]", "output": "[5,4,3,2,1]"},
            {"input": "head = [1,2]", "output": "[2,1]"}
        ],
        starter_code={
            "python": "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\ndef reverse_list(head: ListNode) -> ListNode:\n    # Your solution here\n    pass",
            "javascript": "function reverseList(head) {\n    // Your solution here\n}"
        },
        test_cases=[
            {"input": {"vals": [1, 2, 3, 4, 5]}, "expected": [5, 4, 3, 2, 1], "description": "Standard case"},
            {"input": {"vals": [1, 2]}, "expected": [2, 1], "description": "Two nodes"},
            {"input": {"vals": []}, "expected": [], "description": "Empty list"}
        ],
        constraints=["The number of nodes in the list is in the range [0, 5000]", "-5000 <= Node.val <= 5000"],
        hints=["Think about three pointers: prev, current, next", "You can also do it recursively"]
    ),

    InterviewQuestion(
        id="max_depth_tree",
        title="Maximum Depth of Binary Tree",
        difficulty="easy",
        category="trees",
        description="Given the root of a binary tree, return its maximum depth. A binary trees maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
        examples=[
            {"input": "root = [3,9,20,null,null,15,7]", "output": "3"},
            {"input": "root = [1,null,2]", "output": "2"}
        ],
        starter_code={
            "python": "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\ndef max_depth(root: TreeNode) -> int:\n    # Your solution here\n    pass",
            "javascript": "function maxDepth(root) {\n    // Your solution here\n}"
        },
        test_cases=[
            {"input": {"vals": [3, 9, 20, None, None, 15, 7]}, "expected": 3, "description": "Balanced tree"},
            {"input": {"vals": [1, None, 2]}, "expected": 2, "description": "Skewed right"},
            {"input": {"vals": []}, "expected": 0, "description": "Empty tree"}
        ],
        constraints=["The number of nodes in the tree is in the range [0, 10^4]", "-100 <= Node.val <= 100"],
        hints=["Use recursion: depth = 1 + max(depth(left), depth(right))", "Or use BFS with level-order traversal"]
    ),

    InterviewQuestion(
        id="climbing_stairs",
        title="Climbing Stairs",
        difficulty="easy",
        category="dp",
        description="You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
        examples=[
            {"input": "n = 2", "output": "2", "explanation": "There are two ways: (1+1) and (2)."},
            {"input": "n = 3", "output": "3", "explanation": "There are three ways: (1+1+1), (1+2), and (2+1)."}
        ],
        starter_code={
            "python": "def climb_stairs(n: int) -> int:\n    # Your solution here\n    pass",
            "javascript": "function climbStairs(n) {\n    // Your solution here\n}"
        },
        test_cases=[
            {"input": {"n": 2}, "expected": 2, "description": "Two steps"},
            {"input": {"n": 3}, "expected": 3, "description": "Three steps"},
            {"input": {"n": 4}, "expected": 5, "description": "Four steps"},
            {"input": {"n": 5}, "expected": 8, "description": "Five steps"},
            {"input": {"n": 1}, "expected": 1, "description": "One step"}
        ],
        constraints=["1 <= n <= 45"],
        hints=["This is the Fibonacci sequence!", "ways(n) = ways(n-1) + ways(n-2)"]
    ),

    InterviewQuestion(
        id="coin_change",
        title="Coin Change",
        difficulty="medium",
        category="dp",
        description="You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.",
        examples=[
            {"input": "coins = [1,2,5], amount = 11", "output": "3", "explanation": "11 = 5 + 5 + 1"},
            {"input": "coins = [2], amount = 3", "output": "-1"}
        ],
        starter_code={
            "python": "def coin_change(coins: list[int], amount: int) -> int:\n    # Your solution here\n    pass",
            "javascript": "function coinChange(coins, amount) {\n    // Your solution here\n}"
        },
        test_cases=[
            {"input": {"coins": [1, 2, 5], "amount": 11}, "expected": 3, "description": "Standard case"},
            {"input": {"coins": [2], "amount": 3}, "expected": -1, "description": "Impossible"},
            {"input": {"coins": [1], "amount": 0}, "expected": 0, "description": "Zero amount"},
            {"input": {"coins": [1, 2, 5], "amount": 100}, "expected": 20, "description": "Large amount"}
        ],
        constraints=["1 <= coins.length <= 12", "1 <= amount <= 10^4"],
        hints=["Use dynamic programming", "dp[i] = minimum coins needed for amount i"]
    ),

    InterviewQuestion(
        id="binary_search",
        title="Binary Search",
        difficulty="easy",
        category="sorting",
        description="Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.",
        examples=[
            {"input": "nums = [-1,0,3,5,9,12], target = 9", "output": "4", "explanation": "9 exists in nums and its index is 4"},
            {"input": "nums = [-1,0,3,5,9,12], target = 2", "output": "-1", "explanation": "2 does not exist in nums so return -1"}
        ],
        starter_code={
            "python": "def binary_search(nums: list[int], target: int) -> int:\n    # Your solution here\n    pass",
            "javascript": "function binarySearch(nums, target) {\n    // Your solution here\n}"
        },
        test_cases=[
            {"input": {"nums": [-1, 0, 3, 5, 9, 12], "target": 9}, "expected": 4, "description": "Target found"},
            {"input": {"nums": [-1, 0, 3, 5, 9, 12], "target": 2}, "expected": -1, "description": "Target not found"},
            {"input": {"nums": [5], "target": 5}, "expected": 0, "description": "Single element"},
            {"input": {"nums": [1, 2, 3, 4, 5, 6], "target": 6}, "expected": 5, "description": "Last element"}
        ],
        constraints=["1 <= nums.length <= 10^4", "-10^4 < nums[i], target < 10^4", "All integers in nums are unique"],
        hints=["Use two pointers: left and right", "Calculate mid = (left + right) // 2"]
    ),
]


def get_random_question(difficulty: str = None, category: str = None) -> Dict[str, Any]:
    """Get a random interview question, optionally filtered by difficulty and category."""
    filtered = INTERVIEW_QUESTIONS
    
    if difficulty:
        filtered = [q for q in filtered if q.difficulty == difficulty]
    if category:
        filtered = [q for q in filtered if q.category == category]
    
    if not filtered:
        filtered = INTERVIEW_QUESTIONS
    
    question = random.choice(filtered)
    
    return {
        "id": question.id,
        "title": question.title,
        "difficulty": question.difficulty,
        "category": question.category,
        "description": question.description,
        "examples": question.examples,
        "starter_code": question.starter_code,
        "test_cases": question.test_cases,
        "constraints": question.constraints,
        "hints": question.hints
    }


def get_question_by_id(question_id: str) -> Dict[str, Any]:
    """Get a specific question by ID."""
    for question in INTERVIEW_QUESTIONS:
        if question.id == question_id:
            return {
                "id": question.id,
                "title": question.title,
                "difficulty": question.difficulty,
                "category": question.category,
                "description": question.description,
                "examples": question.examples,
                "starter_code": question.starter_code,
                "test_cases": question.test_cases,
                "constraints": question.constraints,
                "hints": question.hints
            }
    return None


def get_all_questions() -> List[Dict[str, Any]]:
    """Get all available questions."""
    return [
        {
            "id": q.id,
            "title": q.title,
            "difficulty": q.difficulty,
            "category": q.category
        }
        for q in INTERVIEW_QUESTIONS
    ]
