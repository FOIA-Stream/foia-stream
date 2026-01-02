#!/bin/bash
echo "=== Docker Containers ===" > docker_diagnosis.txt
docker compose ps -a >> docker_diagnosis.txt 2>&1

echo -e "\n=== Docker Logs ===" >> docker_diagnosis.txt
docker compose logs --tail=50 >> docker_diagnosis.txt 2>&1
