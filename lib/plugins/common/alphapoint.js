const BigNumber = require("bignumber.js");
const APEX = require("alphapoint").APEX;

const alphapoint = {
  connection: null
};
let user = null;
let products = null;
let instruments = null;

const initApiConnection = gateway => {
  return new Promise((resolve, reject) => {
    alphapoint.connection = new APEX(gateway, {
      onopen: resolve,
      onclose: reject
    });
    alphapoint.connection.standardCallback = () => {};
  });
};

const fetchProducts = async user => {
  products = await alphapoint.connection.GetProducts({ OMSId: user.OMSId });
};

const getProductId = async (user, symbol) => {
  if (!products) {
    await fetchProducts(user);
  }

  const result = products.find(x => x.Product === symbol);

  return result.ProductId;
};

const fetchInstruments = async OMSId => {
  instruments = await alphapoint.connection.GetInstruments({ OMSId });
};

const getInstrumentId = async (cryptoCode, fiatCode, OMSId = 1) => {
  if (!instruments) {
    await fetchInstruments(OMSId);
  }

  const result = instruments.find(x => x.Symbol === `${cryptoCode}${fiatCode}`);

  return result.InstrumentId;
};

const auth = async account => {
  if (!alphapoint.connection) {
    await initApiConnection(account.gateway);
  }
  if (!user) {
    const response = await alphapoint.connection.AuthenticateUser({
      APIKey: account.APIKey,
      Signature: account.Signature,
      UserId: account.UserId,
      Nonce: account.Nonce
    });

    if (!response.Authenticated) {
      throw new Error(`Authentication failed: ${JSON.stringify(response)}`);
    }

    user = {
      accountId: response.User.AccountId,
      userId: response.User.UserId,
      OMSId: response.User.OMSId
    };
  }

  return user;
};

const getLevel1Data = instrumentId => {
  return new Promise(resolve => {
    const level1Ins = {
      instrumentId,
      callback: updates => {
        alphapoint.connection.unsubscribeLevel1(instrumentId);
        resolve(JSON.parse(updates.o));
      }
    };

    alphapoint.connection.level1.next(level1Ins);
  });
};

const orderSide = {
  buy: "0",
  sell: "1"
};

const getAvailableBalance = (balance, hold) => {
  return balance ? balance - hold : 0;
};

const checkBalance = async (user, fiatCode, cryptoCode, side, amount) => {
  const instrumentId = await getInstrumentId(cryptoCode, fiatCode, user.OMSId);

  const rates = await getLevel1Data(instrumentId);

  const { BestBid } = rates;

  const positions = await alphapoint.connection.GetAccountPositions({
    OMSId: user.OMSId,
    AccountId: user.accountId
  });

  const fiatBalance = positions.find(
    position => position.ProductSymbol === fiatCode
  );
  const cryptoBalance = positions.find(
    position => position.ProductSymbol === cryptoCode
  );

  const fiatAvailableBalance = getAvailableBalance(
    fiatBalance.Amount,
    fiatBalance.Hold
  );
  const cryptoAvailableBalance = getAvailableBalance(
    cryptoBalance.Amount,
    cryptoBalance.Hold
  );

  if (side === orderSide.sell) {
    return amount > cryptoAvailableBalance ? false : true;
  } else {
    return amount * BestBid > fiatAvailableBalance ? false : true;
  }
};

const BN = (s, radix) => {
  return new BigNumber(s, radix);
};

const check2FA = async user => {
  const userConfig = await alphapoint.connection.GetUserConfig({
    UserId: user.userId
  });

  const google2faConfig = userConfig.find(x => x.Key === "UseGoogle2FA");

  if (!google2faConfig || google2faConfig.Value === "false") {
    throw new Error("2FA should be enabled for the account");
  }
};

module.exports = {
  initApiConnection,
  alphapoint: alphapoint,
  auth,
  getInstrumentId,
  getProductId,
  getLevel1Data,
  checkBalance,
  BN,
  check2FA
};
