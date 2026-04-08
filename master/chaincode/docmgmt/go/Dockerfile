FROM golang:1.21-alpine
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o chaincode
ENV CHAINCODE_SERVER_ADDRESS=0.0.0.0:7052
ENV CHAINCODE_ID=documentCC_1.0:0be5e8efe0576b6c68b2ba6ba86fd0af68325e33550544993a4e5197667cc0c4
CMD ["./chaincode"]
