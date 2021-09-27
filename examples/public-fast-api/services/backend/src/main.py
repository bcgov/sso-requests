from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from helpers import Jwk
import jwt

jwk = Jwk();

app = FastAPI()

# NEW
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/secret")
def home(request: Request):
    auth_header = request.headers.get('Authorization').split(' ')[1]
    try:
        data = jwk.authenticate(auth_header)
        return 'verified as {}, secret is: Mellon'.format(data['name'])
    except (jwt.exceptions.DecodeError):
        return 'Failed to authenticate'
