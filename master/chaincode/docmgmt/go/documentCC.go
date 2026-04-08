package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// DocumentCC provides functions for managing document metadata
type DocumentCC struct {
	contractapi.Contract
}

// Document describes document metadata recorded on the ledger
type Document struct {
	CID      string `json:"CID"`
	Filename string `json:"Filename"`
	WorkerID string `json:"WorkerID"`
	AddedAt  string `json:"AddedAt"`
}

// InitLedger is a placeholder for future initialization
func (s *DocumentCC) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// CreateDocument records a new document metadata on the ledger
func (s *DocumentCC) CreateDocument(ctx contractapi.TransactionContextInterface, cid string, filename string, workerId string, addedAt string) error {
	exists, err := s.DocumentExists(ctx, cid)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the document %s already exists", cid)
	}

	doc := Document{
		CID:      cid,
		Filename: filename,
		WorkerID: workerId,
		AddedAt:  addedAt,
	}
	docJSON, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(cid, docJSON)
}

// QueryDocument returns the document metadata stored in the world state with given CID.
func (s *DocumentCC) QueryDocument(ctx contractapi.TransactionContextInterface, cid string) (*Document, error) {
	docJSON, err := ctx.GetStub().GetState(cid)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if docJSON == nil {
		return nil, fmt.Errorf("the document %s does not exist", cid)
	}

	var doc Document
	err = json.Unmarshal(docJSON, &doc)
	if err != nil {
		return nil, err
	}

	return &doc, nil
}

// DocumentExists returns true when document with given CID exists in world state
func (s *DocumentCC) DocumentExists(ctx contractapi.TransactionContextInterface, cid string) (bool, error) {
	docJSON, err := ctx.GetStub().GetState(cid)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return docJSON != nil, nil
}

// GetAllDocuments returns all documents found in world state
func (s *DocumentCC) GetAllDocuments(ctx contractapi.TransactionContextInterface) ([]*Document, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var docs []*Document
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var doc Document
		err = json.Unmarshal(queryResponse.Value, &doc)
		if err != nil {
			return nil, err
		}
		docs = append(docs, &doc)
	}

	return docs, nil
}

func main() {
	docCC, err := contractapi.NewChaincode(&DocumentCC{})
	if err != nil {
		log.Panicf("Error creating documentCC chaincode: %v", err)
	}

	if err := docCC.Start(); err != nil {
		log.Panicf("Error starting documentCC chaincode: %v", err)
	}
}
