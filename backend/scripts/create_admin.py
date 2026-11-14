
from getpass import getpass

from sqlalchemy import select

from app.database import SessionLocal
from app.models import User
from app.security import hash_password


def main():
    email = "admin@gmail.com"

    print("\n=== AgriDemand AI | Admin Provisioning ===")

    password = getpass("Enter new admin password: ")
    confirm = getpass("Confirm admin password: ")

    if len(password) < 12:
        print("Password must contain at least 12 characters.")
        return

    if password != confirm:
        print("Passwords do not match.")
        return

    db = SessionLocal()

    try:
        existing = db.scalar(
            select(User).where(User.email == email)
        )

        if existing:
            if existing.role == "admin":
                print("Admin account already exists.")
            else:
                print(
                    "This email already belongs to a non-admin account. "
                    "No changes were made."
                )
            return

        admin = User(
            full_name="AgriDemand Administrator",
            email=email,
            role="admin",
            password_hash=hash_password(password),
            is_active=True,
        )

        db.add(admin)
        db.commit()

        print("\nAdmin account created successfully.")
        print("Email:", email)
        print("Role: admin")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
