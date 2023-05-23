import { pixelCoordToTileCoord } from "@latticexyz/phaserx";
import {
  Entity,
  Has,
  defineEnterSystem,
  getComponentValueStrict,
} from "@latticexyz/recs";
import { Assets, TILE_HEIGHT, TILE_WIDTH } from "../constants";
import { PhaserLayer } from "../createPhaserLayer";
import {
  InteractiveEvent,
  getInteractiveTile,
} from "../utils/InteractriveObjectUtils";

export const createInteractiveSystem = (layer: PhaserLayer) => {
  const {
    superfluid,
    world,
    scenes: {
      Main: { input, objectPool, phaserScene },
    },
    networkLayer: {
      playerEntityId,
      network: {
        network: { signer },
      },
      systemCalls: { setSapphireStream },
      components: { Position, SFStoreTable, SFSuperTokenTable },
      playerEntity,
    },
  } = layer;

  input.pointerdown$.subscribe((event, ...rest) => {
    console.log({ ...event, rest });

    const x = event.pointer.worldX;
    const y = event.pointer.worldY;

    const position = pixelCoordToTileCoord({ x, y }, TILE_WIDTH, TILE_HEIGHT);
    console.log("Clicked on tile", position.x, position.y);

    const eventTile = getInteractiveTile(position.x, position.y);
    if (eventTile) handleInteractiveEvent(eventTile.event);
  });

  function handleInteractiveEvent(event: InteractiveEvent) {
    switch (event) {
      case InteractiveEvent.StartMining:
        return startMining();
      case InteractiveEvent.StartExchange:
        return startExchange();
      case InteractiveEvent.MintNFT:
        return mintNFT();
    }
  }

  async function mintNFT() {
    const nftBuilding = getComponentValueStrict(
      SFSuperTokenTable,
      "0x03" as Entity
    );

    const signerToUse = signer.get();
    if (!nftBuilding || !signerToUse) return;

    const myAddress = await signerToUse.getAddress();
    if (!myAddress) return;

    const superToken = await superfluid.framework.loadSuperToken("SPHR");

    const superTokenBalance = await superToken.balanceOf({
      account: myAddress,
      providerOrSigner: signerToUse,
    });

    console.log("SPHR balance", superTokenBalance);
    console.log("NFT Payload", {
      flowRate: "500000000",
      receiver: nftBuilding.superTokenAddress,
      overrides: {
        gasPrice: "0",
      },
    });

    const transactionResult = await superToken
      .createFlow({
        flowRate: "100",
        receiver: nftBuilding.superTokenAddress,
        overrides: {
          gasPrice: "0",
        },
      })
      .exec(signerToUse);

    phaserScene.add
      .sprite(46, 21, Assets.Crystals, 5)
      .setOrigin(0, 0)
      .setDepth(1);
  }

  async function startExchange() {
    const storeData = getComponentValueStrict(SFStoreTable, "0x01" as Entity);
    const signerToUse = signer.get();
    if (!storeData || !signerToUse || !playerEntityId) return;

    const superToken = await superfluid.framework.loadSuperToken("SPHR");

    const superTokenBalance = await superToken.balanceOf({
      account: playerEntityId,
      providerOrSigner: signerToUse,
    });

    console.log("Sapphire balance", { superTokenBalance });
    const transactionResult = await superToken
      .createFlow({
        flowRate: "100000",
        receiver: storeData.storeAddress,
        overrides: {
          gasPrice: "0",
        },
      })
      .exec(signerToUse);
  }

  function startMining() {
    setSapphireStream();
  }

  defineEnterSystem(world, [Has(Position)], ({ entity }) => {
    if (playerEntity === entity) {
      const playerSprite = objectPool.get(entity, "Sprite");
      const userSprite = phaserScene.children.getByName(
        `player-${playerSprite.id}`
      );
      console.log("Found user sprite, adding callback");
      if (userSprite) {
        console.log("Adding callback");
        userSprite.on(
          "changedata",
          (...args: any) => {
            console.log("HANDLING CALLBACK", args);
          },
          phaserScene
        );
      }
    }
  });
};
