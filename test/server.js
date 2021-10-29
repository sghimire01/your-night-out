// Imports the server.js file to be tested.
let server = require("../server");
//Assertion (Test Driven Development) and Should, Expect(Behaviour driven development) library
let chai = require("chai");
// Chai HTTP provides an interface for live integration testing of the API's.
let chaiHttp = require("chai-http");
chai.should();
chai.use(chaiHttp);
const { expect } = chai;
var assert = chai.assert;


describe("Server!", () => {

    // Sample test case given to test / endpoint.
    it("Returns the default welcome message", done => {
      chai
        .request(server)
        .get("/")
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body.status).to.equals("success");
          assert.strictEqual(res.body.message, "Welcome!");
          done();
        });
    });

    // Please add your test cases here.

//1. a test case for this API to check if the response of the API :
//Is of type array.
//The size of the array should not be zero.
  it("A test case for this API to check if the operations response is an array that is not empty", done => {
      chai
      .request(server)
      .get("/operations")
      .end((err, res) => {
        expect(res.body).to.be.an('array').that.is.not.empty;
        done();
      });
    });

//2. Write a test case for this API to fetch the operation with id=1 and check if the response of the API :
//Has the property id equal to 1.
//Has the property name.
//Has the property sign.
it("A test case for this API to fetch the operation with id=1 and check if the response of the API has the property id equal to 1, has the property name, and has the property sign.", done => {
    chai
    .request(server)
    .get("/operations/1")
    .end((err, res) => {
      expect(res.body.id).to.equal(1);
      expect(res.body).to.have.property('name')
      expect(res.body).to.have.property('sign');
      done();
    });
  });

// 3. Write a test case for this API that adds a new operation and check if the response of the API :
// Has the property id equal to 4.
// Has the property name equal to the name of the newly added operation.
// Has the property sign equal to the sign of the newly added operation.
it("A test case for this API that adds a new operation and check if the response of the API the property id equal to 4, Has the property name equal to the name of the newly added operation, and Has the property sign equal to the sign of the newly added operation", done => {
    chai
    .request(server)
    .post("/operations")
    .send({name: "NewOp"}, {sign: "%"})
    .end((err, res) => {
      expect(res.body.id).to.equal(4);
      expect({name: "NewOp"}).to.have.property('name');
      expect({sign: "%"}).to.have.property('sign');
      done();
    });
  });

  });
