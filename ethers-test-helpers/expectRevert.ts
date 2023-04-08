import { assert } from 'chai'

export async function expectRevert(promise: Promise<any>, message: string) {
    await promise
        .then(() => assert.fail())
        .catch((err: any) => {
            if (
                !!err.message &&
                typeof err.message === 'string' &&
                !err.message.includes(message)
            ) {
                console.log(err.message)
            }
            assert.include(err.message, message)
        })
}