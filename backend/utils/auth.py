import os
from datetime import datetime,timedelta,timezone

from jose import jwt
from dotenv import load_dotenv

load_dotenv()

secret_key=os.getenv("JWT_SECRET_KEY")
algorithm=os.getenv("JWT_ALGO")
access_token_expire_minutes=int(os.getenv("JWT_EXP_MIN"))

def create_acc_tok(data:dict):
    payload=data.copy()
    expire=datetime.now(timezone.utc)+timedelta(minutes=access_token_expire_minutes)
    payload["exp"]=expire
    encoded_jwt=jwt.encode(payload,secret_key,algorithm=algorithm)
    return encoded_jwt
