import os
import requests
from dotenv import load_dotenv

load_dotenv()

url = "https://api.github.com/repos/narang24/TravelStory-VN/commits"

headers = {
    "Authorization": f"Bearer {os.getenv('GITHUB_TOKEN')}"
}

response = requests.get(url, headers = headers)
print(response.status_code)
data = response.json()
sha = data[0]["sha"]
commit_response = requests.get(f"{url}/{sha}", headers = headers)
commit = commit_response.json()
for file in commit["files"]:
    print(file["filename"])