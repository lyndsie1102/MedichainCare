def test_user_login(client, doctor_user, doctor_auth_token):
    response = client.post(
        "/users/login",
        json={
            "username": doctor_user.username,
            "password": "testpassword",
            "role": "doctor",
        },
        headers={"Authorization": f"Bearer {doctor_auth_token}"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_invalid_password(client, doctor_user):
    response = client.post(
        "/users/login",
        json={
            "username": doctor_user.username,
            "password": "wrongpassword",
            "role": "doctor",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_role_mismatch(client, doctor_user):
    response = client.post(
        "/users/login",
        json={
            "username": doctor_user.username,
            "password": "testpassword",
            "role": "patient",
        },
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Role mismatch: Invalid role for user"


def test_invalid_username(client, doctor_user):
    response = client.post(
        "/users/login",
        json={
            "username": "nonexistentuser",
            "password": "testpassword",
            "role": "doctor",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"
