"""Create an admin account, or promote an existing one.

python -m app.create_admin you@example.com "Your Name"
"""

import getpass
import sys

from sqlalchemy import func, select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import User


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit('Usage: python -m app.create_admin EMAIL ["Name"]')
    email = sys.argv[1].strip().lower()
    name = sys.argv[2] if len(sys.argv) > 2 else email.split("@")[0]

    with SessionLocal() as db:
        user = db.scalar(select(User).where(func.lower(User.email) == email))
        if user:
            user.role = "admin"
            db.commit()
            print(f"{email} is now an admin.")
            return
        password = getpass.getpass("Password (min. 8 characters): ")
        if len(password) < 8:
            sys.exit("Password too short.")
        db.add(User(email=email, name=name, password_hash=hash_password(password), role="admin", email_verified=True))
        db.commit()
        print(f"Admin {email} created.")


if __name__ == "__main__":
    main()
