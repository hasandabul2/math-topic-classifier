"""
Math Topic Classifier - Simple Test Suite
"""

import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    print("\n[TEST] Health...")
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        if r.status_code == 200:
            print(f"  [OK] {r.json()['mode']} mode")
            return True
        print(f"  [FAIL]")
        return False
    except Exception as e:
        print(f"  [FAIL] {e}")
        return False

def test_home():
    print("\n[TEST] Home Page...")
    try:
        r = requests.get(BASE_URL, timeout=5)
        if r.status_code == 200:
            print(f"  [OK]")
            return True
        return False
    except Exception as e:
        print(f"  [FAIL] {e}")
        return False

def test_random():
    print("\n[TEST] Random Question...")
    try:
        r = requests.get(f"{BASE_URL}/random-question", timeout=5)
        if r.status_code == 200:
            print(f"  [OK]")
            return True
        return False
    except Exception as e:
        print(f"  [FAIL] {e}")
        return False

def test_prediction():
    print("\n[TEST] Prediction...")
    try:
        r = requests.post(f"{BASE_URL}/predict", 
                         data={'question': 'Find derivative of x^2'},
                         timeout=10)
        if r.status_code == 200:
            result = r.json()
            if result.get('success'):
                print(f"  [OK] {result['prediction']} ({result['confidence']}%)")
                return True
        print(f"  [FAIL]")
        return False
    except Exception as e:
        print(f"  [FAIL] {e}")
        return False

def main():
    print("="*50)
    print("MATH TOPIC CLASSIFIER - TESTS")
    print("="*50)
    
    # Check server
    try:
        requests.get(BASE_URL, timeout=2)
    except:
        print("\n[ERROR] Server not running!")
        print("Start: start_demo.bat")
        return 1
    
    # Run tests
    results = [
        test_health(),
        test_home(),
        test_random(),
        test_prediction(),
    ]
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print("\n" + "="*50)
    print(f"RESULT: {passed}/{total} passed")
    print("="*50)
    
    if passed == total:
        print("[SUCCESS] ALL TESTS PASSED!")
        return 0
    else:
        print(f"[FAILED] {total - passed} tests")
        return 1

if __name__ == "__main__":
    sys.exit(main())
