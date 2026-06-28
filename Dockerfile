FROM python:3-alpine

WORKDIR /app

COPY . /app

EXPOSE 8080

CMD ["python", "-m", "http.server", "8080"]
