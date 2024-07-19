FROM python:3.9

EXPOSE 8000

COPY . /code
WORKDIR /code
RUN pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]