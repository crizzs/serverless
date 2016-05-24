'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const path = require('path');
const os = require('os');
const Create = require('../create');
const Serverless = require('../../../Serverless');
const S = new Serverless();

describe('Create', () => {
  let create;

  before(() => {
    create = new Create(S);
  });

  describe('#constructor()', () => {
    it('should have commands', () => expect(create.commands).to.be.not.empty);

    it('should have hooks', () => expect(create.hooks).to.be.not.empty);
  });

  describe('#prompt()', () => {
    beforeEach(() => {
      create.options.name = 'valid-service-name';
      create.options.stage = 'dev';
      create.options.region = 'aws_useast1';
    });

    it('should NOT generate greeting if not interactive', () => {
      const greetingStub = sinon.stub(create.serverless.instances.cli, 'asciiGreeting');
      return create.prompt().then(() => {
        expect(greetingStub.notCalled).to.be.equal(true);
        create.serverless.instances.cli.asciiGreeting.restore();
      });
    });

    it('should generate greeting if interactive', () => {
      create.serverless.instances.config.interactive = true;
      const greetingStub = sinon.stub(create.serverless.instances.cli, 'asciiGreeting');
      return create.prompt().then(() => {
        expect(greetingStub.calledOnce).to.be.equal(true);
        create.serverless.instances.cli.asciiGreeting.restore();
        create.serverless.instances.config.interactive = false;
      });
    });
  });

  describe('#validate()', () => {
    it('it should resolve if name is valid and all required options provided', () => {
      create.options.name = 'valid-service-name';
      create.options.stage = 'dev';
      create.options.region = 'aws_useast1';
      return create.validate();
    });

    it('it should throw error if name is invalid', () => {
      create.options.name = 'invalid_service_name';
      create.options.stage = 'dev';
      create.options.region = 'aws_useast1';
      expect(() => create.validate()).to.throw(Error);
    });

    it('it should throw error if name is missing', () => {
      create.options.name = null;
      create.options.stage = 'dev';
      create.options.region = 'aws_useast1';
      expect(() => create.validate()).to.throw(Error);
    });

    it('it should throw error if stage is missing', () => {
      create.options.name = 'valid-service-name';
      create.options.stage = null;
      create.options.region = 'aws_useast1';
      expect(() => create.validate()).to.throw(Error);
    });

    it('it should throw error if region is missing', () => {
      create.options.name = 'valid-service-name';
      create.options.stage = 'dev';
      create.options.region = null;
      expect(() => create.validate()).to.throw(Error);
    });

    it('should set servicePath based on service name', () => {
      create.options.name = 'valid-service-name';
      create.options.stage = 'dev';
      create.options.region = 'aws_useast1';
      create.validate().then(() => expect(create.serverless.instances.config.servicePath)
          .to.be.equal(path.join(process.cwd(), create.options.name)));
    });
  });

  describe('#parse()', () => {
    it('it should parse template files', () => {
      create.parse().spread((yaml, json) => {
        expect(Object.keys(yaml).length !== 0).to.be.equal(true);
        expect(Object.keys(json).length !== 0).to.be.equal(true);
      });
    });
  });

  describe('#scaffold()', () => {
    let fakeYaml;
    let fakeJson;
    let tmpDir;
    before(() => {
      create.options.name = 'new-service';
      create.options.stage = 'dev';
      create.options.region = 'aws_useast_1';
      fakeYaml = { service: '' };
      fakeJson = { name: '' };
      tmpDir = path.join(os.tmpdir(), (new Date).getTime().toString(), create.options.name);
      create.serverless.instances.config.servicePath = tmpDir;
    });

    it('should generate handler.js', () => {
      create.scaffold(fakeYaml, fakeJson).then(() => {
        expect(create.serverless.instances.utils.fileExistsSync(path.join(tmpDir, 'handler.js')))
          .to.be.equal(true);
      });
    });

    it('should generate serverless.yaml and set correct service name', () => {
      create.scaffold(fakeYaml, fakeJson).then(() => {
        expect(create.serverless.instances.utils
          .fileExistsSync(path.join(tmpDir, 'serverless.yaml'))).to.be.equal(true);
        create.serverless.instances.yamlParser
          .parse(path.join(tmpDir, 'serverless.yaml')).then((serverlessYaml) => {
            expect(serverlessYaml.service).to.be.equal('new-service');
          });
      });
    });

    it('should generate package.json and set correct package name', () => {
      create.scaffold(fakeYaml, fakeJson).then(() => {
        expect(create.serverless.instances.utils
          .fileExistsSync(path.join(tmpDir, 'package.json'))).to.be.equal(true);
        const packageJson = create.serverless.instances.utils
          .readFileSync(path.join(tmpDir, 'package.json'));
        expect(packageJson.name).to.be.equal('new-service');
      });
    });

    it('should generate serverless.env.yaml and set correct stage and region', () => {
      create.scaffold(fakeYaml, fakeJson).then(() => {
        expect(create.serverless.instances.utils
          .fileExistsSync(path.join(tmpDir, 'serverless.env.yaml'))).to.be.equal(true);
        create.serverless.instances.yamlParser
          .parse(path.join(tmpDir, 'serverless.env.yaml')).then((serverlessEnvYaml) => {
            expect(typeof serverlessEnvYaml.stages.dev.regions.aws_useast1).to.be.equal('object');
          });
      });
    });
  });

  describe('#finish()', () => {
    it('should log 5 messages', () => {
      const logStub = sinon.stub(create.serverless.instances.cli, 'log');
      create.finish();
      expect(logStub.callCount).to.be.equal(5);
      create.serverless.instances.cli.log.restore();
    });
  });
});