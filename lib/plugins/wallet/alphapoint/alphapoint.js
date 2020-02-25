const BN = require("../../../bn");
const { auth, alphapoint, getProductId } = require("../../common/alphapoint");

const NAME = "Alphapoint";

const SUPPORTED_COINS = ["BTC", "LTC", "ETH", "BAB", "REP", "XMR"];

const getWallet = async (account, cryptoCode) => {
  const user = await auth(account);
  const positions = await alphapoint.connection.GetAccountPositions({
    OMSId: user.OMSId,
    AccountId: user.accountId
  });

  const wallet = positions.find(
    position => position.ProductSymbol === cryptoCode
  );

  return wallet;
};

const checkCryptoCode = cryptoCode => {
  if (!SUPPORTED_COINS.includes(cryptoCode)) {
    return Promise.reject(new Error("Unsupported crypto: " + cryptoCode));
  }

  return Promise.resolve();
};

const balance = async (account, cryptoCode) => {
  await checkCryptoCode(cryptoCode);

  const wallet = await getWallet(account, cryptoCode);

  return BN(wallet.Amount - wallet.Hold);
};

const getWithdrawTemplateType = async (user, cryptoCode) => {
  const payload = {
    ProductId: await getProductId(user, cryptoCode),
    OMSId: user.OMSId,
    AccountId: user.accountId
  };
  const response = await alphapoint.connection.RPCPromise(
    "GetWithdrawFormTemplateTypes",
    payload
  );

  const data = JSON.parse(response.o);

  if (data.TemplateTypes.length === 0) {
    throw new Error(`There are no providers configured for ${cryptoCode}.`);
  }

  const result = data.TemplateTypes[0].TemplateName;

  return result;
};

const getTransactionId = async (user, requestCode, attempt = 1) => {
  const MAX_ATTEMPT = 5;
  if (attempt === MAX_ATTEMPT) {
    return null;
  }
  const withdrawTicketRes = await alphapoint.connection.GetWithdrawTicket({
    OMSId: user.OMSId,
    AccountId: user.accountId,
    RequestCode: requestCode
  });
  const transitionDetails = JSON.parse(
    withdrawTicketRes.WithdrawTransactionDetails
  );

  if (transitionDetails.TxId) {
    return transitionDetails.TxId;
  }

  await new Promise(resolve =>
    setTimeout(() => resolve(), 2 ** attempt * 1000)
  );

  return getTransactionId(user, requestCode, attempt + 1);
};

const sendCoins = async (account, address, cryptoAtoms, cryptoCode) => {
  const user = await auth(account);

  await checkCryptoCode(cryptoCode);
  await check2FA(user);

  const templateType = await getWithdrawTemplateType(user, cryptoCode);

  const payload = {
    OMSId: user.OMSId,
    AccountId: user.accountId,
    ProductId: await getProductId(user, cryptoCode),
    Amount: cryptoAtoms,
    TemplateForm: JSON.stringify({
      ExternalAddress: address,
      TemplateType: templateType
    }),
    TemplateType: templateType
  };
  const res = await alphapoint.connection.CreateWithdrawTicket(payload);

  if (!res.result) {
    throw new Error(res.detail);
  }

  const txId = await getTransactionId(user, res.detail);

  return { txid: txId, fee: BN(res.FeeAmt) };
};

const getStatus = async (account, address) => {
  const user = await auth(account);

  const tickets = await alphapoint.connection.GetWithdrawTickets({
    OMSId: user.OMSId,
    AccountId: user.accountId
  });

  const transferDetails = tickets
    .filter(ticket => {
      const templateForm = JSON.parse(ticket.TemplateForm);
      return templateForm.ExternalAddress === address;
    })
    .sort((a, b) => b.CreatedTimestampTick - a.CreatedTimestampTick);

  const Status =
    transferDetails.length > 0 ? transferDetails[0].Status : undefined;

  switch (Status) {
    case "Confirmed":
      return { status: "confirmed" };
    case "Accepted":
    case "AutoAccepted":
    case "Pending":
    case "Pending2Fa":
    case "Processing":
    case "Delayed":
      return { status: "authorized" };

    case "Rejected":
    case "Failed":
      return { status: "rejected" };

    default:
      return { status: "notSeen" };
  }
};

const newAddress = async (account, info) => {
  const { cryptoCode } = info;
  const user = await auth(account);

  await checkCryptoCode(cryptoCode);

  const payload = {
    OMSId: user.OMSId,
    AccountId: user.accountId,
    ProductId: await getProductId(user, cryptoCode),
    GenerateNewKey: true
  };

  const response = await alphapoint.connection.GetDepositInfo(payload);

  if (response.result) {
    const addresses = JSON.parse(response.DepositInfo);

    if (addresses.length === 0) {
      throw new Error("Failed generating new address");
    }
    return addresses[0];
  } else {
    throw new Error("Failed generating new address");
  }
};

const newFunding = async (account, cryptoCode) => {
  const address = await newAddress(account, { cryptoCode });

  const wallet = await getWallet(account, cryptoCode);

  const result = {
    fundingPendingBalance: BN(wallet.Hold),
    fundingConfirmedBalance: BN(wallet.Amount),
    fundingAddress: address
  };

  return result;
};

module.exports = {
  NAME,
  balance,
  sendCoins,
  getStatus,
  newAddress,
  newFunding
};
