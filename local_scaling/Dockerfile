FROM python:3.9
COPY . ./src
COPY requirements.txt ./
RUN pip install -r requirements.txt
CMD ["python", "./src/main.py"]