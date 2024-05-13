docker exec -it language-learning-mariadb-1 sh -c 'mariadb -uapp-user -p"app-user-password" language-learning-db'

# mariadb-dump --user=app-user --password --lock-tables --databases language-learning-db > /data/db.sql